import cron from "node-cron";
import { query } from "@/config/db";
import { logger } from "@/config/logger";
import { NotificationService } from "@/modules/notifications/notification.service";

let notesSchedulerTask: any = null;

export class NotesScheduler {
  static init() {
    // Run everyday at 6:00 PM (18:00)
    notesSchedulerTask = cron.schedule("0 18 * * *", async () => {
      logger.info("Running daily notes digest job...");
      try {
        await this.processDailyDigest();
      } catch (error) {
        logger.error({ error }, "Error in daily notes digest job");
      }
    });
    logger.info("NotesScheduler initialized. Digest job scheduled for 18:00 daily.");
  }

  static stop() {
    if (notesSchedulerTask) {
      notesSchedulerTask.stop();
      logger.info("NotesScheduler stopped.");
    }
  }

  static async processDailyDigest() {
    // 1. Fetch notes created in the last 24 hours
    const notesRes = await query(`
      SELECT n.id, n.title, nen.education_node_id as node_id, e.name as context_name
      FROM notes n
      JOIN note_education_nodes nen ON n.id = nen.note_id
      JOIN education_nodes e ON nen.education_node_id = e.id
      WHERE n.created_at >= NOW() - INTERVAL '24 HOURS'
        AND n.deleted_at IS NULL
        AND n.status = 'PUBLISHED'
    `);

    if (notesRes.rowCount === 0) {
      logger.info("No new notes in the last 24 hours. Skipping digest.");
      return;
    }

    // 2. Map nodes to note counts and names
    // node_id -> { count: number, name: string }
    const nodeStats = new Map<string, { count: number, name: string }>();

    for (const row of notesRes.rows) {
      const nodeId = row.node_id;
      if (!nodeId) continue;

      const current = nodeStats.get(nodeId) || { count: 0, name: row.context_name || "your subjects" };
      current.count++;
      nodeStats.set(nodeId, current);
    }

    if (nodeStats.size === 0) return;

    // 3. For each node, find users and batch notifications
    for (const [nodeId, stats] of nodeStats.entries()) {
      // Find students subscribed to this node
      const usersRes = await query(`
        SELECT u.id 
        FROM users u
        JOIN user_education_nodes uen ON u.id = uen.user_id
        WHERE uen.node_id = $1 AND u.role = 'student'
      `, [nodeId]);

      const userIds = usersRes.rows.map(r => r.id);
      
      if (userIds.length > 0) {
        const title = `New ${stats.name} Notes`;
        const body = `📚 ${stats.count} new notes for ${stats.name} are available today.`;
        
        await NotificationService.sendPushNotifications({
          userIds,
          title,
          body,
          data: { type: "daily_notes_digest", nodeId }
        });
        
        logger.info(`Sent digest to ${userIds.length} users for node ${stats.name}`);
      }
    }
    
    logger.info("Daily notes digest job completed successfully.");
  }
}
