import cron from "node-cron";
import { logger } from "@/config/logger";
import { redis } from "@/config/redis";
import { query } from "@/config/db";
import { NotificationService } from "@/modules/notifications/notification.service";

let aiSchedulerTask: any = null;

export function startAIScheduler() {
  logger.info("Starting AI Companion Scheduler (node-cron)");

  // Run every 5 minutes
  aiSchedulerTask = cron.schedule("*/5 * * * *", async () => {
    try {
      const lockKey = "ai_companion:scheduler_lock";
      const lockAcquired = await redis.set(lockKey, "locked", "EX", 290, "NX");
      
      if (!lockAcquired) {
        return; // Another instance is running this cycle
      }

      logger.debug("Acquired AI scheduler cron lock");

      await processUpcomingTasks();
      await processMissedTasks();
    } catch (err) {
      logger.error(err, "Error in AI companion scheduler");
    }
  });
}

async function processUpcomingTasks() {
  // Find tasks starting in the next 15 minutes that haven't been notified yet
  const res = await query(`
    SELECT t.id as task_id, t.title, p.user_id 
    FROM study_tasks t
    JOIN study_plans p ON t.plan_id = p.id
    WHERE t.status = 'pending' 
      AND t.start_time IS NOT NULL
      AND t.start_time > NOW()
      AND t.start_time <= NOW() + INTERVAL '15 minutes'
  `);

  for (const row of res.rows) {
    const cacheKey = `notified:upcoming_task:${row.task_id}`;
    const alreadySent = await redis.get(cacheKey);

    if (!alreadySent) {
      try {
        await NotificationService.sendToUser(
          row.user_id,
          "Upcoming Study Session",
          `Your session "${row.title}" starts in 15 minutes!`,
          { type: "upcoming_task", taskId: row.task_id }
        );
        await redis.set(cacheKey, "true", "EX", 86400); // Prevent duplicates for 24 hours
      } catch (e) {
        logger.error(e, "Failed to send upcoming task notification");
      }
    }
  }
}

async function processMissedTasks() {
  // Find tasks that were scheduled to start > 1 hour ago and are still pending
  const res = await query(`
    SELECT t.id as task_id, t.title, p.user_id 
    FROM study_tasks t
    JOIN study_plans p ON t.plan_id = p.id
    WHERE t.status = 'pending' 
      AND t.start_time IS NOT NULL
      AND t.start_time < NOW() - INTERVAL '1 hour'
  `);

  for (const row of res.rows) {
    const cacheKey = `notified:missed_task:${row.task_id}`;
    const alreadySent = await redis.get(cacheKey);

    if (!alreadySent) {
      try {
        await NotificationService.sendToUser(
          row.user_id,
          "Missed Session",
          `You missed your "${row.title}" session. Open StudySwap to reschedule or skip it.`,
          { type: "missed_task", taskId: row.task_id }
        );
        await redis.set(cacheKey, "true", "EX", 86400 * 7); // Prevent duplicates for a week
      } catch (e) {
        logger.error(e, "Failed to send missed task notification");
      }
    }
  }
}

export function stopAIScheduler() {
  if (aiSchedulerTask) {
    aiSchedulerTask.stop();
    logger.info("AI Companion Scheduler stopped.");
  }
}
