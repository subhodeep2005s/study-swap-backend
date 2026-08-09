import { query, getClient } from "@/config/db";
import { AppError } from "@/core/errors/AppError";
import type { PoolClient } from "pg";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PersonalSessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface PersonalStudySession {
  id: string;
  task_id: string;
  user_id: string;
  status: PersonalSessionStatus;
  started_at: Date;
  paused_at: Date | null;
  ended_at: Date | null;
  duration_seconds: number | null;
  accumulated_seconds: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class SessionRepository {
  /**
   * Verify the task belongs to the requesting user.
   * Returns the task row or throws 404.
   */
  static async verifyTaskOwnership(taskId: string, userId: string): Promise<{ id: string; plan_id: string; duration: number; status: string }> {
    const res = await query(
      `SELECT t.id, t.plan_id, t.duration, t.status
       FROM study_tasks t
       JOIN study_plans p ON p.id = t.plan_id
       WHERE t.id = $1 AND p.user_id = $2`,
      [taskId, userId]
    );
    if (res.rows.length === 0) {
      throw new AppError("Task not found or you do not have permission", 404);
    }
    return res.rows[0] as { id: string; plan_id: string; duration: number; status: string };
  }

  /**
   * Get the current active or paused session for a user (at most one at a time).
   */
  static async getActiveSessionForUser(userId: string): Promise<PersonalStudySession | null> {
    const res = await query<PersonalStudySession>(
      `SELECT * FROM personal_study_sessions
       WHERE user_id = $1 AND status IN ('active', 'paused')
       LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  /**
   * Get sessions for a specific task.
   */
  static async getSessionsForTask(taskId: string, userId: string): Promise<PersonalStudySession[]> {
    const res = await query<PersonalStudySession>(
      `SELECT * FROM personal_study_sessions
       WHERE task_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [taskId, userId]
    );
    return res.rows;
  }

  /**
   * Get a single session by ID, verifying ownership.
   */
  static async getSessionById(sessionId: string, userId: string): Promise<PersonalStudySession> {
    const res = await query<PersonalStudySession>(
      `SELECT * FROM personal_study_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    if (!res.rows[0]) throw new AppError("Session not found", 404);
    return res.rows[0];
  }

  /**
   * START a new personal study session.
   * Enforces:
   *   - Task belongs to user
   *   - No currently active/paused session for this user (uq_one_active_session_per_user)
   *   - No active session for this specific task (uq_one_active_session_per_task)
   */
  static async startSession(taskId: string, userId: string): Promise<PersonalStudySession> {
    await this.verifyTaskOwnership(taskId, userId);

    // Check for conflicting active session (informative error before hitting the DB constraint)
    const existing = await this.getActiveSessionForUser(userId);
    if (existing) {
      throw new AppError(
        `You already have an active session for another task (session ${existing.id}). End or abandon it first.`,
        409
      );
    }

    try {
      const res = await query<PersonalStudySession>(
        `INSERT INTO personal_study_sessions (task_id, user_id, status, started_at)
         VALUES ($1, $2, 'active', NOW())
         RETURNING *`,
        [taskId, userId]
      );
      return res.rows[0]!;
    } catch (e: any) {
      if (e.code === "23505") {
        // Unique constraint violation — active session already exists for task/user
        throw new AppError("A session is already active for this task.", 409);
      }
      throw e;
    }
  }

  /**
   * PAUSE a session.
   * Records paused_at timestamp and accumulates elapsed seconds since start/last resume.
   */
  static async pauseSession(sessionId: string, userId: string): Promise<PersonalStudySession> {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const session = await this._lockSession(client, sessionId, userId);

      if (session.status !== "active") {
        throw new AppError(`Cannot pause a session that is '${session.status}'.`, 400);
      }

      const nowSeconds = this._elapsedSecondsSince(session.started_at, session.accumulated_seconds);

      const res = await client.query<PersonalStudySession>(
        `UPDATE personal_study_sessions
         SET status = 'paused', paused_at = NOW(),
             accumulated_seconds = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [nowSeconds, sessionId]
      );

      await client.query("COMMIT");
      return res.rows[0]!;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * RESUME a paused session.
   * Clears paused_at and resets started_at to now so elapsed time calculation stays correct.
   */
  static async resumeSession(sessionId: string, userId: string): Promise<PersonalStudySession> {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const session = await this._lockSession(client, sessionId, userId);

      if (session.status !== "paused") {
        throw new AppError(`Cannot resume a session that is '${session.status}'.`, 400);
      }

      const res = await client.query<PersonalStudySession>(
        `UPDATE personal_study_sessions
         SET status = 'active', started_at = NOW(), paused_at = NULL,
             accumulated_seconds = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [session.accumulated_seconds, sessionId]
      );

      await client.query("COMMIT");
      return res.rows[0]!;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * END a session (completed or abandoned).
   * Computes final duration_seconds and updates study_tasks.actual_duration.
   */
  static async endSession(
    sessionId: string,
    userId: string,
    outcome: "completed" | "abandoned",
    notes?: string
  ): Promise<PersonalStudySession> {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const session = await this._lockSession(client, sessionId, userId);

      if (session.status === "completed" || session.status === "abandoned") {
        // Idempotent — already ended
        await client.query("ROLLBACK");
        return session;
      }

      // Compute total studied seconds
      const totalSeconds =
        session.status === "paused"
          ? session.accumulated_seconds
          : this._elapsedSecondsSince(session.started_at, session.accumulated_seconds);

      // Persist session
      const res = await client.query<PersonalStudySession>(
        `UPDATE personal_study_sessions
         SET status = $1, ended_at = NOW(), duration_seconds = $2,
             notes = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [outcome, totalSeconds, notes || null, sessionId]
      );

      // Recompute actual_duration on the task from ALL completed sessions (including the just-completed one)
      await client.query(
        `UPDATE study_tasks
         SET actual_duration = (
           SELECT COALESCE(SUM(duration_seconds), 0)
           FROM personal_study_sessions
           WHERE task_id = $1 AND status = 'completed'
         ),
         updated_at = NOW()
         WHERE id = $2`,
        [session.task_id, session.task_id]
      );

      await client.query("COMMIT");
      return res.rows[0]!;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private static async _lockSession(
    client: PoolClient,
    sessionId: string,
    userId: string
  ): Promise<PersonalStudySession> {
    const res = await client.query<PersonalStudySession>(
      `SELECT * FROM personal_study_sessions WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [sessionId, userId]
    );
    if (!res.rows[0]) throw new AppError("Session not found", 404);
    return res.rows[0];
  }

  /**
   * Compute seconds elapsed since `startedAt`, adding `accumulated` from previous segments.
   */
  private static _elapsedSecondsSince(startedAt: Date, accumulated: number): number {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return accumulated + Math.max(0, elapsed);
  }
}
