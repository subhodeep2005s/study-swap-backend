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
      FROM user_education_nodes ue
      JOIN education_nodes e ON ue.node_id = e.id
      WHERE ue.user_id = p.user_id
    ) AS "selectedEducationNodes"
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
    const educationNodesRes = await query(`
      SELECT e.name 
      FROM user_education_nodes ue 
      JOIN education_nodes e ON ue.node_id = e.id 
      WHERE ue.user_id = $1
    `, [userId]);
    const educationNodes = educationNodesRes.rows.map((r: any) => r.name);
    return { state, educationNodes };
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
        FROM user_education_nodes ue
        JOIN education_nodes e ON ue.node_id = e.id
        WHERE ue.user_id = p.user_id
      ) AS "selectedEducationNodes"
    FROM user_matches m
    JOIN profiles p ON p.user_id = m.matched_user_id
    WHERE m.user_id = $1 AND m.id = $2
    `;
    const result = await query(queryStr, [userId, matchId]);
    return result.rows[0];
  }

  static async generateMatches(client: PoolClient, userId: string, limit: number) {
    const { resolvePriorityBuckets } = await import("./matches.logic");
    const userInfoRes = await client.query('SELECT state FROM profiles WHERE user_id = $1', [userId]);
    const userState = userInfoRes.rows[0]?.state || null;

    const buckets = await resolvePriorityBuckets(client, userId);
    if (buckets.length === 0) return { rows: [] };

    const collectedMatches: any[] = [];
    let remaining = limit;

    const userTypes = ['NEVER_SEEN', 'PENDING', 'SAVED'];

    for (const userType of userTypes) {
      for (const bucket of buckets) {
        if (remaining <= 0) break;

        let stateCondition = '';
        if (bucket.stateMatch === true) {
           stateCondition = userState ? 'AND (p.state IS NOT NULL AND p.state = $3)' : 'AND FALSE';
        } else if (bucket.stateMatch === false) {
           stateCondition = userState ? 'AND (p.state IS NULL OR p.state != $3)' : 'AND TRUE';
        }

        let userTypeCondition = '';
        if (userType === 'NEVER_SEEN') {
           userTypeCondition = 'AND NOT EXISTS (SELECT 1 FROM user_matches um WHERE um.user_id = $1 AND um.matched_user_id = u.id)';
        } else if (userType === 'PENDING' || userType === 'SAVED') {
           userTypeCondition = `AND EXISTS (SELECT 1 FROM user_matches um WHERE um.user_id = $1 AND um.matched_user_id = u.id AND um.status = '${userType.toLowerCase()}')`;
        }

        const query = `
          SELECT matched_user_id FROM (
            SELECT DISTINCT u.id AS matched_user_id
            FROM users u
            JOIN profiles p ON u.id = p.user_id
            JOIN user_education_nodes ue ON ue.user_id = u.id
            WHERE u.role = 'student'
              AND u.id != $1
              AND u.onboarding_completed = true
              AND ue.node_id = ANY($2::uuid[])
              AND NOT EXISTS (
                SELECT 1 FROM user_matches um 
                WHERE um.user_id = $1 
                  AND um.matched_user_id = u.id 
                  AND um.status IN ('accepted', 'rejected', 'removed')
              )
              ${stateCondition}
              ${userTypeCondition}
          ) sub
          ORDER BY md5(matched_user_id::text || gen_random_uuid()::text)
          LIMIT $4
        `;

        const res = await client.query(query, userState ? [userId, bucket.targetNodeIds, userState, remaining] : [userId, bucket.targetNodeIds, null, remaining]);

        for (const row of res.rows) {
          if (!collectedMatches.find(m => m.matched_user_id === row.matched_user_id)) {
            collectedMatches.push({
              matched_user_id: row.matched_user_id,
              matched_by: bucket.sourcePriority === 1 || bucket.sourcePriority === 3 || bucket.sourcePriority === 5 ? 'exam_state' : 'exam', // Backward compat
              source_priority: bucket.sourcePriority
            });
            remaining--;
            if (remaining <= 0) break;
          }
        }
      }
      if (remaining <= 0) break;
    }

    return { rows: collectedMatches };
  }

  static async insertMatches(client: PoolClient, userId: string, matches: any[]) {
    if (matches.length === 0) return;
    const valuesParams: any[] = [];
    const queryValues: string[] = [];
    let index = 1;
    for (const m of matches) {
      queryValues.push(`($${index++}, $${index++}, $${index++}, 'pending', $${index++}, NOW())`);
      valuesParams.push(userId, m.matched_user_id, m.matched_by, m.source_priority);
    }
    await client.query(`
      INSERT INTO user_matches (user_id, matched_user_id, matched_by, status, source_priority, shown_at)
      VALUES ${queryValues.join(", ")}
      ON CONFLICT (user_id, matched_user_id) 
      DO UPDATE SET 
        status = 'pending', 
        matched_by = EXCLUDED.matched_by,
        source_priority = EXCLUDED.source_priority,
        refresh_number = user_matches.refresh_number + 1,
        shown_at = NOW(),
        updated_at = NOW()
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
