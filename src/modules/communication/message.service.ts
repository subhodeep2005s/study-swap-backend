import { getClient, query } from "@/config/db";
import { AppError } from "@/core/errors/AppError";
import { CommunicationRepository } from "./communication.repository";
import { getIO } from "./communication.socket";
import { v4 as uuidv4 } from "uuid";
import { NotificationService } from "@/modules/notifications/notification.service";
import { redis } from "@/config/redis";

export class MessageService {
  /**
   * Validates if a user is part of a match, and if the match is ACCEPTED.
   * Returns the partner's ID.
   */
  static async validateMatchAndGetPartner(conversationId: string, userId: string): Promise<string> {
    const match = await CommunicationRepository.validateMatchAndGetPartner(conversationId, userId);

    if (!match) {
      throw new AppError("Conversation not found", 404);
    }
    if (match.status !== 'accepted') {
      throw new AppError("You can only communicate with accepted matches", 403);
    }

    if (match.user_id !== userId && match.matched_user_id !== userId) {
      throw new AppError("You are not a participant in this conversation", 403);
    }

    return match.user_id === userId ? match.matched_user_id : match.user_id;
  }

  static async sendMessage(
    userId: string, 
    conversationId: string, 
    messageType: string, 
    message?: string, 
    replyToMessageId?: string,
    attachment?: any
  ) {
    // 1. Validate match status and get partner
    const partnerId = await this.validateMatchAndGetPartner(conversationId, userId);

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // 2. Save the message
      const savedMessage = await CommunicationRepository.saveMessage(
        client, conversationId, userId, messageType, message, replyToMessageId
      );

      // 3. Save attachment if provided
      let savedAttachment = null;
      if (attachment) {
        savedAttachment = await CommunicationRepository.saveAttachment(client, savedMessage.id, userId, attachment);
      }

      // 4. Update conversation last_message_id
      await CommunicationRepository.updateConversationLastMessage(client, conversationId, savedMessage.id);

      await client.query("COMMIT");

      // 5. Emit via Socket.IO
      const payload = {
        conversationId,
        timestamp: Date.now(),
        eventId: uuidv4(),
        message: {
          ...savedMessage,
          attachment: savedAttachment
        }
      };

      const io = getIO();
      // Send to the conversation room (both users if online)
      io.to(`conv_${conversationId}`).emit("new_message", payload);

      // 6. Push Notification
      const isOnline = await redis.get(`presence:${partnerId}`);
      if (isOnline !== "ONLINE") {
        // We do this asynchronously so it doesn't block the request
        NotificationService.sendToUser(
          partnerId,
          "New Message",
          messageType === "TEXT" ? message || "Sent a message" : `Sent an attachment`,
          { type: "new_message", conversationId }
        ).catch(err => console.error("Push error", err));
      }

      return payload.message;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async getMessages(userId: string, conversationId: string, cursor?: string) {
    await this.validateMatchAndGetPartner(conversationId, userId);
    return CommunicationRepository.getMessagesCursor(conversationId, cursor);
  }

  static async getAttachments(userId: string, conversationId: string, cursor?: string) {
    await this.validateMatchAndGetPartner(conversationId, userId);
    return CommunicationRepository.getAttachmentsCursor(conversationId, cursor);
  }

  static async deleteMessage(userId: string, messageId: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const msg = await CommunicationRepository.getMessageById(client, messageId);
      if (!msg) throw new AppError("Message not found", 404);
      
      if (msg.sender_id !== userId) throw new AppError("You can only delete your own messages", 403);
      if (msg.deleted_at) throw new AppError("Message is already deleted", 400);

      const deleted = await CommunicationRepository.updateMessageDeleted(client, messageId);

      await client.query("COMMIT");

      const io = getIO();
      io.to(`conv_${msg.conversation_id}`).emit("message_deleted", {
        conversationId: msg.conversation_id,
        timestamp: Date.now(),
        eventId: uuidv4(),
        messageId: messageId
      });

      return deleted;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async editMessage(userId: string, messageId: string, newText: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const msg = await CommunicationRepository.getMessageById(client, messageId);
      if (!msg) throw new AppError("Message not found", 404);
      
      if (msg.sender_id !== userId) throw new AppError("You can only edit your own messages", 403);
      if (msg.message_type !== 'TEXT') throw new AppError("Only text messages can be edited", 400);
      if (msg.deleted_at) throw new AppError("Cannot edit a deleted message", 400);

      const updated = await CommunicationRepository.updateMessageText(client, messageId, newText);
      await client.query("COMMIT");

      const io = getIO();
      io.to(`conv_${msg.conversation_id}`).emit("message_edited", {
        conversationId: msg.conversation_id,
        timestamp: Date.now(),
        eventId: uuidv4(),
        message: updated
      });

      return updated;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async markRead(userId: string, conversationId: string) {
    const partnerId = await this.validateMatchAndGetPartner(conversationId, userId);

    const rows = await CommunicationRepository.markMessagesRead(conversationId, userId);

    if (rows && rows.length > 0) {
      const io = getIO();
      
      const payload = {
        conversationId,
        timestamp: Date.now(),
        eventId: uuidv4(),
        readAt: rows[0]!.read_at,
        messageIds: rows.map((r: any) => r.id)
      };

      // Emit to the partner who sent the messages
      io.to(`user_${partnerId}`).emit("messages_read", payload);
      // Also emit to the conversation room for other devices of the reader
      io.to(`conv_${conversationId}`).emit("messages_read", payload);
    }
  }
}
