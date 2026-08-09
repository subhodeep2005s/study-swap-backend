/**
 * Shared test helpers for the AI Companion production-hardening test suite.
 */
import { getClient } from "@/config/db";
import { redis } from "@/config/redis";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

/**
 * Insert a minimal test student into the DB and return a signed JWT.
 */
export async function createTestUser(emailPrefix = "aitest"): Promise<TestUser> {
  const client = await getClient();
  try {
    const email = `${emailPrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    const res = await client.query(
      `INSERT INTO users (email, role, onboarding_completed) VALUES ($1, 'student', true) RETURNING id`,
      [email]
    );
    const id = res.rows[0].id as string;
    const token = jwt.sign({ id, email, role: "student" }, env.JWT_SECRET, { expiresIn: "1h" });
    return { id, email, token };
  } finally {
    client.release();
  }
}

/**
 * Delete a test user and all their cascaded data.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
  } finally {
    client.release();
  }
}

/**
 * Directly insert a study plan + tasks and return the plan id.
 */
export async function seedPlanWithTasks(
  userId: string,
  date: string,
  tasks: { title: string; duration: number; priority?: string; start_time?: Date | null }[]
): Promise<{ planId: string; taskIds: string[] }> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const planRes = await client.query(
      `INSERT INTO study_plans (user_id, date, planned_minutes) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET planned_minutes = EXCLUDED.planned_minutes
       RETURNING id`,
      [userId, date, tasks.reduce((a, t) => a + t.duration, 0)]
    );
    const planId = planRes.rows[0].id as string;
    const taskIds: string[] = [];
    for (const t of tasks) {
      const taskRes = await client.query(
        `INSERT INTO study_tasks (plan_id, title, duration, priority, start_time)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [planId, t.title, t.duration, t.priority || "medium", t.start_time || null]
      );
      taskIds.push(taskRes.rows[0].id as string);
    }
    await client.query("COMMIT");
    return { planId, taskIds };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Directly read the status of a study_task from the DB.
 */
export async function getTaskStatus(taskId: string): Promise<string | null> {
  const client = await getClient();
  try {
    const res = await client.query("SELECT status FROM study_tasks WHERE id = $1", [taskId]);
    return res.rows[0]?.status ?? null;
  } finally {
    client.release();
  }
}

/**
 * Read the actual_minutes of a plan directly from the DB.
 */
export async function getPlanActualMinutes(planId: string): Promise<number> {
  const client = await getClient();
  try {
    const res = await client.query("SELECT actual_minutes FROM study_plans WHERE id = $1", [planId]);
    return res.rows[0]?.actual_minutes ?? 0;
  } finally {
    client.release();
  }
}

/**
 * Count how many tasks exist for a plan (used to detect orphan/duplicate tasks).
 */
export async function countTasksForPlan(planId: string): Promise<number> {
  const client = await getClient();
  try {
    const res = await client.query("SELECT COUNT(*)::int as c FROM study_tasks WHERE plan_id = $1", [planId]);
    return res.rows[0]?.c ?? 0;
  } finally {
    client.release();
  }
}

/**
 * Flush Redis keys matching a pattern (for cleaning up rate-limit / notification keys).
 */
export async function flushRedisPattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}

/**
 * Generate an expired JWT token.
 */
export function expiredToken(userId: string): string {
  return jwt.sign({ id: userId, email: "expired@test.com", role: "student" }, env.JWT_SECRET, {
    expiresIn: "-1s"
  });
}

/**
 * Generate a JWT with a tampered role (mentor impersonating admin).
 */
export function tamperedToken(userId: string): string {
  return jwt.sign({ id: userId, email: "evil@test.com", role: "admin" }, "wrong-secret-key", {
    expiresIn: "1h"
  });
}

export const TODAY = new Date().toISOString().split("T")[0]!;
export const TOMORROW = new Date(Date.now() + 86400000).toISOString().split("T")[0]!;
