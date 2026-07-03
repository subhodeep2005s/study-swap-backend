import { query, getClient } from "@/config/db";
import { AppError } from "@/core/errors/AppError";
import { logger } from "@/config/logger";
import { redis } from "@/config/redis";
import { Event, eventEmitter } from "@/config/event";
import { getStories } from "@/modules/stories/stories.service";

const MATCH_LIMIT = 10;
const LOCK_TTL = 30; // seconds

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

function mapMatchReason(match: any, exams: string[], state: string | null) {
  if (match.matchedBy === "exam_state") {
    const commonExams = match.selectedExams.filter((e: string) => exams.includes(e));
    const reasonStr = commonExams.length > 0 ? commonExams.join(", ") : "the same exams";
    match.matchReason = `You both are preparing for ${reasonStr} and are from ${state || "the same state"}.`;
  } else if (match.matchedBy === "exam") {
    const commonExams = match.selectedExams.filter((e: string) => exams.includes(e));
    const reasonStr = commonExams.length > 0 ? commonExams.join(", ") : "the same exams";
    match.matchReason = `You both are preparing for ${reasonStr}.`;
  }
  return match;
}

async function getMatchContext(userId: string) {
  const profileRes = await query("SELECT state FROM profiles WHERE user_id = $1", [userId]);
  const state = profileRes.rows[0]?.state || null;
  const examsRes = await query(`
    SELECT e.name 
    FROM user_exams ue 
    JOIN exams e ON ue.exam_id = e.id 
    WHERE ue.user_id = $1
  `, [userId]);
  const exams = examsRes.rows.map(r => r.name);
  return { state, exams };
}

async function attachStories(matches: any[]) {
  if (matches.length === 0) return matches;
  const userIds = matches.map(m => m.userId);
  const storiesMap = await getStories(userIds);
  for (const match of matches) {
    match.story = storiesMap[match.userId] || null;
  }
  return matches;
}

export async function getPendingMatches(userId: string) {
  const result = await query(matchProjectionQuery, [userId, "pending"]);
  const context = await getMatchContext(userId);
  const matches = result.rows.map(row => mapMatchReason(row, context.exams, context.state));
  return attachStories(matches);
}

export async function getSavedMatches(userId: string) {
  const result = await query(matchProjectionQuery, [userId, "saved"]);
  const context = await getMatchContext(userId);
  const matches = result.rows.map(row => mapMatchReason(row, context.exams, context.state));
  return attachStories(matches);
}

export async function getAcceptedMatches(userId: string) {
  const result = await query(matchProjectionQuery, [userId, "accepted"]);
  const context = await getMatchContext(userId);
  const matches = result.rows.map(row => mapMatchReason(row, context.exams, context.state));
  return attachStories(matches);
}

export async function getMatch(userId: string, matchId: string) {
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
  if (result.rows.length === 0) {
    throw new AppError("Match not found", 404);
  }
  const context = await getMatchContext(userId);
  const mappedMatch = mapMatchReason(result.rows[0], context.exams, context.state);
  const storiesMap = await getStories([mappedMatch.userId]);
  mappedMatch.story = storiesMap[mappedMatch.userId] || null;
  return mappedMatch;
}

export async function refreshMatches(userId: string) {
  const lockKey = `match:refresh:${userId}`;
  const lock = await redis.set(lockKey, "locked", "EX", LOCK_TTL, "NX");

  if (!lock) {
    return { message: "Matching already in progress." };
  }

  try {
    const pendingMatches = await getPendingMatches(userId);
    if (pendingMatches.length > 0) {
      return pendingMatches;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // New algorithm:
      // 1. Find users who share at least one exam (mandatory requirement)
      // 2. Among those, rank by: exam_state (same exams + same state) > exam (same exams only)
      // 3. Within each tier, sort by number of common exams (more = better match)
      // 4. NO state-only matches. NO unrelated profiles.
      const matchQuery = `
        WITH user_info AS (
          SELECT p.state
          FROM profiles p
          WHERE p.user_id = $1
        ),
        user_exam_ids AS (
          SELECT exam_id FROM user_exams WHERE user_id = $1
        ),
        excluded_users AS (
          SELECT matched_user_id AS user_id FROM user_matches WHERE user_id = $1 AND status != 'rejected'
          UNION
          SELECT $1 AS user_id
        ),
        -- Only users who share at least one exam (mandatory)
        exam_eligible AS (
          SELECT 
            eu.id AS matched_user_id,
            eu.state,
            COUNT(ue.exam_id) AS common_exam_count
          FROM (
            SELECT u.id, p.state
            FROM users u
            JOIN profiles p ON u.id = p.user_id
            WHERE u.role = 'student'
              AND u.onboarding_completed = true
              AND u.id NOT IN (SELECT user_id FROM excluded_users)
          ) eu
          JOIN user_exams ue ON ue.user_id = eu.id
          WHERE ue.exam_id IN (SELECT exam_id FROM user_exam_ids)
          GROUP BY eu.id, eu.state
        ),
        ranked_matches AS (
          SELECT
            em.matched_user_id,
            CASE
              WHEN em.state IS NOT NULL AND em.state = (SELECT state FROM user_info) THEN 'exam_state'
              ELSE 'exam'
            END AS matched_by,
            CASE
              WHEN em.state IS NOT NULL AND em.state = (SELECT state FROM user_info) THEN 1
              ELSE 2
            END AS priority,
            em.common_exam_count
          FROM exam_eligible em
        )
        SELECT matched_user_id, matched_by
        FROM ranked_matches
        ORDER BY priority ASC, common_exam_count DESC
        LIMIT $2;
      `;

      const matchesRes = await client.query(matchQuery, [userId, MATCH_LIMIT]);

      if (matchesRes.rows.length > 0) {
        const valuesParams: any[] = [];
        const queryValues: string[] = [];
        let index = 1;
        for (const m of matchesRes.rows) {
          queryValues.push(`($${index++}, $${index++}, $${index++}, 'pending')`);
          valuesParams.push(userId, m.matched_user_id, m.matched_by);
        }
        await client.query(`
          INSERT INTO user_matches (user_id, matched_user_id, matched_by, status)
          VALUES ${queryValues.join(", ")}
          ON CONFLICT (user_id, matched_user_id) 
          DO UPDATE SET status = 'pending', matched_by = EXCLUDED.matched_by, updated_at = NOW()
        `, valuesParams);

        // Emit event for new matches
        eventEmitter.emit(Event.MATCHES_REFRESHED, { userId });
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return await getPendingMatches(userId);
  } finally {
    await redis.del(lockKey);
  }
}

async function updateMatchStatus(userId: string, matchId: string, currentStatus: string[], nextStatus: string) {
  // First, verify the match exists and check its current status
  const existingRes = await query(`SELECT status FROM user_matches WHERE id = $1 AND user_id = $2`, [matchId, userId]);
  
  if (existingRes.rows.length === 0) {
    throw new AppError("Match not found", 404);
  }

  const currentDbStatus = existingRes.rows[0]!.status;

  // If already at the desired status, give a clear message
  if (currentDbStatus === nextStatus) {
    throw new AppError(`Match is already marked as ${nextStatus}`, 400);
  }

  // If trying to transition from an invalid state
  if (!currentStatus.includes(currentDbStatus)) {
    throw new AppError(`Cannot change match to ${nextStatus} because it is currently '${currentDbStatus}'`, 400);
  }

  // Perform the update
  await query(`
    UPDATE user_matches
    SET status = $1, updated_at = NOW()
    WHERE id = $2 AND user_id = $3
  `, [nextStatus, matchId, userId]);
}

export async function acceptMatch(userId: string, matchId: string) {
  await updateMatchStatus(userId, matchId, ["pending"], "accepted");
}

export async function rejectMatch(userId: string, matchId: string) {
  await updateMatchStatus(userId, matchId, ["pending"], "rejected");
}

export async function saveMatch(userId: string, matchId: string) {
  await updateMatchStatus(userId, matchId, ["pending"], "saved");
}

export async function removeMatch(userId: string, matchId: string) {
  await updateMatchStatus(userId, matchId, ["saved", "accepted"], "removed");
}
