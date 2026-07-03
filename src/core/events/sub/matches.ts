import { Event, eventEmitter } from "@/config/event";
import { sendMail } from "@/config/resend";
import { logger } from "@/config/logger";
import { query } from "@/config/db";
import { getPendingMatches } from "@/modules/matches/matches.service";
import { matchesRefreshedEmailTemplate } from "@/core/utils/email-templates";

export function matchSubscribers() {
  eventEmitter.on(Event.MATCHES_REFRESHED, async (payload) => {
    try {
      const { userId } = payload;

      // Fetch user's email and name
      const userRes = await query(
        `SELECT u.email, p.full_name as user_name 
         FROM users u 
         LEFT JOIN profiles p ON p.user_id = u.id 
         WHERE u.id = $1`,
        [userId]
      );

      if (userRes.rows.length === 0) {
        logger.error({ userId }, "User not found for matches refreshed notification");
        return;
      }

      const user = userRes.rows[0]!;
      const userEmail = user.email;
      const userName = user.user_name || "Student";

      // Fetch the newly generated pending matches (up to 10)
      const matches = await getPendingMatches(userId);
      if (matches.length === 0) {
        return; // No pending matches, nothing to send
      }

      const html = matchesRefreshedEmailTemplate({
        userName,
        matches,
        totalMatches: matches.length,
      });

      // Fire and forget
      sendMail({
        to: userEmail,
        subject: `You have ${matches.length} new study matches!`,
        html: html,
      }).catch(err => logger.error({ err }, "Failed to send new matches email"));

    } catch (error) {
      logger.error({ error, payload }, "Failed to process matches refreshed event");
    }
  });
}
