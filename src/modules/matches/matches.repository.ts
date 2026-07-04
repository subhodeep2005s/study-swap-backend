import { query, getClient } from "@/config/db";
import type { PoolClient } from "pg";

const matchProjectionQuery = `
  SELECT
    m.id AS "matchId",
    p.user_id AS "userId",
    p.full_name AS "fullName",
    p.profile_image AS "profileImage",
    p.age,
    p.gender,
    p.state,
    p.bio,
    p.strong_in AS "strongIn",
    p.need_help_with AS "needHelpWith",
    p.study_time AS "studyTime",
    p.looking_for AS "lookingFor",
    m.matched_by AS "matchedBy",
    (
      SELECT COALESCE(array_agg(e.name), ARRAY[]::text[])
      FROM user_exams ue
      JOIN exams e ON ue.exam_id = e.id
      WHERE ue.user_id = p.user_id
    ) AS "selectedExams"
  FROM user_matches m
  JOIN profiles p ON p.user_id = m.matched_user_id
  WHERE m.user_id = $1 AND m.status = $2
  ORDER BY m.created_at DESC
`;

export class MatchesRepository {
  static async getMatchesByStatus(userId: string, status: string) {
    const result = await query(matchProjectionQuery, [userId, status]);
    return result.rows;
  }

  static async getMatchContext(userId: string) {
    const profileRes = await query("SELECT state FROM profiles WHERE user_id = $1", [userId]);
    const state = profileRes.rows[0]?.state || null;
    const examsRes = await query(`
      SELECT e.name 
      FROM user_exams ue 
      JOIN exams e ON ue.exam_id = e.id 
      WHERE ue.user_id = $1
    `, [userId]);
    const exams = examsRes.rows.map((r: any) => r.name);
    return { state, exams };
  }

  static async getMatch(userId: string, matchId: string) {
    const queryStr = `
    SELECT
      m.id AS "matchId",
      p.user_id AS "userId",
      p.full_name AS "fullName",
      p.profile_image AS "profileImage",
      p.age,
      p.gender,
      p.state,
      p.bio,
      p.strong_in AS "strongIn",
      p.need_help_with AS "needHelpWith",
      p.study_time AS "studyTime",
      p.looking_for AS "lookingFor",
      m.matched_by AS "matchedBy",
      m.status,
      (
        SELECT COALESCE(array_agg(e.name), ARRAY[]::text[])
        FROM user_exams ue
        JOIN exams e ON ue.exam_id = e.id
        WHERE ue.user_id = p.user_id
      ) AS "selectedExams"
    FROM user_matches m
    JOIN profiles p ON p.user_id = m.matched_user_id
    WHERE m.user_id = $1 AND m.id = $2
    `;
    const result = await query(queryStr, [userId, matchId]);
    return result.rows[0];
  }

  static async generateMatches(client: PoolClient, userId: string, limit: number) {
    const userInfoRes = await client.query('SELECT state FROM profiles WHERE user_id = $1', [userId]);
    const userState = userInfoRes.rows[0]?.state || null;

    const userExamsRes = await client.query('SELECT exam_id FROM user_exams WHERE user_id = $1', [userId]);
    const examIds = userExamsRes.rows.map(r => r.exam_id);

    if (examIds.length === 0) {
      return { rows: [] }; // Cannot match if they have no exams
    }

    const collectedMatches: any[] = [];
    let remaining = limit;

    const baseFilter = `
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      JOIN user_exams ue ON ue.user_id = u.id
      WHERE u.role = 'student'
        AND u.id != $1
        AND u.onboarding_completed = true
        AND ue.exam_id = ANY($2::uuid[])
        AND NOT EXISTS (
          SELECT 1 FROM user_matches um 
          WHERE um.user_id = $1 
            AND um.matched_user_id = u.id 
            AND um.status IN ('accepted', 'rejected', 'removed')
        )
    `;

    const getQuery = (stateCondition: string, matchStatusCondition: string) => `
      SELECT DISTINCT u.id AS matched_user_id
      ${baseFilter}
      AND ${stateCondition}
      AND ${matchStatusCondition}
      LIMIT $3
    `;

    const runQuery = async (stateCondition: string, matchStatusCondition: string, matchedBy: string) => {
      if (remaining <= 0) return;
      
      const query = getQuery(stateCondition, matchStatusCondition);
      const res = await client.query(query, [userId, examIds, remaining, userState]);
      
      for (const row of res.rows) {
        if (!collectedMatches.find(m => m.matched_user_id === row.matched_user_id)) {
          collectedMatches.push({
            matched_user_id: row.matched_user_id,
            matched_by: matchedBy
          });
          remaining--;
          if (remaining <= 0) break;
        }
      }
    };

    let stateMatchStr = 'FALSE';
    let stateDiffStr = 'TRUE';
    if (userState) {
      stateMatchStr = '(p.state IS NOT NULL AND p.state = $4)';
      stateDiffStr = '(p.state IS NULL OR p.state != $4)';
    }

    const neverShownStr = 'NOT EXISTS (SELECT 1 FROM user_matches um WHERE um.user_id = $1 AND um.matched_user_id = u.id)';
    const pendingSavedStr = "EXISTS (SELECT 1 FROM user_matches um WHERE um.user_id = $1 AND um.matched_user_id = u.id AND um.status IN ('pending', 'saved'))";

    // Priority 1: Same Exam, Same State, Never Shown
    await runQuery(stateMatchStr, neverShownStr, 'exam_state');

    // Priority 2: Same Exam, Diff State, Never Shown
    await runQuery(stateDiffStr, neverShownStr, 'exam');

    // Priority 3: Same Exam, Same State, Pending/Saved
    await runQuery(stateMatchStr, pendingSavedStr, 'exam_state');

    // Priority 4: Same Exam, Diff State, Pending/Saved
    await runQuery(stateDiffStr, pendingSavedStr, 'exam');

    return { rows: collectedMatches };
  }

  static async insertMatches(client: PoolClient, userId: string, matches: any[]) {
    const valuesParams: any[] = [];
    const queryValues: string[] = [];
    let index = 1;
    for (const m of matches) {
      queryValues.push(`($${index++}, $${index++}, $${index++}, 'pending')`);
      valuesParams.push(userId, m.matched_user_id, m.matched_by);
    }
    await client.query(`
      INSERT INTO user_matches (user_id, matched_user_id, matched_by, status)
      VALUES ${queryValues.join(", ")}
      ON CONFLICT (user_id, matched_user_id) 
      DO UPDATE SET status = 'pending', matched_by = EXCLUDED.matched_by, updated_at = NOW()
    `, valuesParams);
  }

  static async updateMatchStatus(userId: string, matchId: string, currentStatus: string[], nextStatus: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const existingRes = await client.query(`SELECT status FROM user_matches WHERE id = $1 AND user_id = $2 FOR UPDATE`, [matchId, userId]);
      
      if (existingRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { error: "Match not found", code: 404 };
      }

      const currentDbStatus = existingRes.rows[0]!.status;

      if (currentDbStatus === nextStatus) {
        await client.query("ROLLBACK");
        return { error: `Match is already marked as ${nextStatus}`, code: 400 };
      }

      if (!currentStatus.includes(currentDbStatus)) {
        await client.query("ROLLBACK");
        return { error: `Cannot change match to ${nextStatus} because it is currently '${currentDbStatus}'`, code: 400 };
      }

      await client.query(`
        UPDATE user_matches
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
      `, [nextStatus, matchId, userId]);

      await client.query("COMMIT");
      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
