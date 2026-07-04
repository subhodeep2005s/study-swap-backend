import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { query } from "@/config/db";
import { logger } from "@/config/logger";

const expo = new Expo();

export interface SendPushOptions {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  priority?: "default" | "normal" | "high";
}

export class NotificationService {
  /**
   * Retrieves notification tokens for an array of user IDs.
   */
  static async getTokensForUsers(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();

    const result = await query(
      `SELECT id, notification_token FROM users WHERE id = ANY($1) AND notification_token IS NOT NULL`,
      [userIds]
    );

    const tokenMap = new Map<string, string>();
    for (const row of result.rows) {
      tokenMap.set(row.id, row.notification_token);
    }
    
    return tokenMap;
  }

  /**
   * Fire-and-forget method to send push notifications.
   * Does not throw, only logs errors so it doesn't block critical flows.
   */
  static async sendPushNotifications(options: SendPushOptions): Promise<void> {
    try {
      const tokenMap = await this.getTokensForUsers(options.userIds);
      
      const messages: ExpoPushMessage[] = [];

      for (const userId of options.userIds) {
        const pushToken = tokenMap.get(userId);
        
        if (pushToken && Expo.isExpoPushToken(pushToken)) {
          messages.push({
            to: pushToken,
            title: options.title,
            body: options.body,
            data: options.data || {},
            badge: options.badge,
            priority: options.priority || "default",
          });
        }
      }

      if (messages.length === 0) return;

      const chunks = expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          logger.error(error, "Error sending a chunk of push notifications to Expo");
        }
      }

      for (const ticket of tickets) {
        if (ticket.status === "error") {
          logger.warn(`Expo push notification error: ${ticket.message} (${ticket.details?.error})`);
        }
      }
    } catch (error) {
      logger.error(error, "Failed to send push notifications");
    }
  }

  /**
   * Convenience method to send a push notification to a single user.
   */
  static async sendToUser(
    userId: string, 
    title: string, 
    body: string, 
    data?: Record<string, any>,
    priority?: "default" | "normal" | "high"
  ): Promise<void> {
    await this.sendPushNotifications({
      userIds: [userId],
      title,
      body,
      data,
      priority,
    });
  }
}
