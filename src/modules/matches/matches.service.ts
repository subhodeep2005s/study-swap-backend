import { AppError } from "@/core/errors/AppError";
import { env } from "@/config/env";
import { NotificationService } from "@/modules/notifications/notification.service";
import { redis } from "@/config/redis";
import { Event, eventEmitter } from "@/config/event";
import { getStories } from "@/modules/stories/stories.service";
import { MatchesRepository } from "./matches.repository";
import { CommunicationRepository } from "@/modules/communication/communication.repository";
import { getClient, query } from "@/config/db";
import { sendMail } from "@/config/resend";

const MATCH_LIMIT = 10;
const LOCK_TTL = 30; // seconds

function mapMatchReason(match: any, educationNodes: string[], state: string | null) {
  if (match.matchedBy === "exam_state") {
    const commonNodes = match.selectedEducationNodes.filter((e: string) => educationNodes.includes(e));
    const reasonStr = commonNodes.length > 0 ? commonNodes.join(", ") : "the same study goals";
    match.matchReason = `You both are preparing for ${reasonStr} and are from ${state || "the same state"}.`;
  } else if (match.matchedBy === "exam") {
    const commonNodes = match.selectedEducationNodes.filter((e: string) => educationNodes.includes(e));
    const reasonStr = commonNodes.length > 0 ? commonNodes.join(", ") : "the same study goals";
    match.matchReason = `You both are preparing for ${reasonStr}.`;
  }
  return match;
}

async function getMatchContext(userId: string) {
  return MatchesRepository.getMatchContext(userId);
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
  const matchesData = await MatchesRepository.getMatchesByStatus(userId, "pending");
  const context = await getMatchContext(userId);
  const matches = matchesData.map(row => mapMatchReason(row, context.educationNodes, context.state));
  return attachStories(matches);
}

export async function getSavedMatches(userId: string) {
  const matchesData = await MatchesRepository.getMatchesByStatus(userId, "saved");
  const context = await getMatchContext(userId);
  const matches = matchesData.map(row => mapMatchReason(row, context.educationNodes, context.state));
  return attachStories(matches);
}

export async function getAcceptedMatches(userId: string) {
  const matchesData = await MatchesRepository.getMatchesByStatus(userId, "accepted");
  const context = await getMatchContext(userId);
  const matches = matchesData.map(row => mapMatchReason(row, context.educationNodes, context.state));
  return attachStories(matches);
}

export async function getMatch(userId: string, matchId: string) {
  const result = await MatchesRepository.getMatch(userId, matchId);
  if (!result) {
    throw new AppError("Match not found", 404);
  }
  const context = await getMatchContext(userId);
  const mappedMatch = mapMatchReason(result, context.educationNodes, context.state);
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
    // Removed early return: now generates new matches even if pending ones exist
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // New algorithm:
      // 1. Find users who share at least one education node (mandatory requirement)
      // 2. Among those, rank by: exam_state (same nodes + same state) > exam (same nodes only)
      // 3. Within each tier, sort by number of common nodes (more = better match)
      // 4. NO state-only matches. NO unrelated profiles.
      const matchesRes = await MatchesRepository.generateMatches(client, userId, MATCH_LIMIT);

      if (matchesRes.rows.length > 0) {
        await MatchesRepository.insertMatches(client, userId, matchesRes.rows);

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
  const result = await MatchesRepository.updateMatchStatus(userId, matchId, currentStatus, nextStatus);
  if (result.error) {
    throw new AppError(result.error, result.code);
  }
}

export async function acceptMatch(userId: string, matchId: string) {
  await updateMatchStatus(userId, matchId, ["pending"], "accepted");
  await CommunicationRepository.getOrCreateConversation(matchId);

  // Send an email to the user who was accepted
  const matchInfo = await query(`
    SELECT 
      m.matched_user_id,
      u.email as target_email,
      p.full_name as actor_name,
      p.profile_image as actor_image
    FROM user_matches m
    JOIN users u ON u.id = m.matched_user_id
    JOIN profiles p ON p.user_id = m.user_id
    WHERE m.id = $1 AND m.user_id = $2
  `, [matchId, userId]);

  if (matchInfo.rows.length > 0) {
    const { target_email, actor_name, actor_image, matched_user_id } = matchInfo.rows[0]! as any;
    const name = actor_name || "Someone";
    const imgSrc = actor_image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(name);

    NotificationService.sendToUser(
      matched_user_id,
      "Match Accepted!",
      `${name} accepted your match request. Say hi!`,
      { type: "match_accepted", matchId }
    ).catch(err => console.error("Push error", err));

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${imgSrc}" alt="${name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #4f46e5;" />
        </div>
        <h2 style="color: #1f2937; text-align: center;">You have a new match!</h2>
        <p style="color: #4b5563; font-size: 16px; text-align: center;">
          <strong>${name}</strong> just accepted your profile on StudySwap!
        </p>
        <p style="color: #4b5563; font-size: 16px; text-align: center;">
          You can now start chatting, schedule a study call, or jump into a focus session together.
        </p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://studyswap.app/messages" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Message ${name}</a>
        </div>
      </div>
    `;

    await sendMail({
      to: target_email,
      subject: "You have a new match on StudySwap! 🎉",
      html: emailHtml
    });
  }
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
