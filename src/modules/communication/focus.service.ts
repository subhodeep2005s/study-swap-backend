import { getClient, query } from "@/config/db";
import { AppError } from "@/core/errors/AppError";
import { CommunicationRepository } from "./communication.repository";
import { MessageService } from "./message.service";
import { LiveKitService } from "./livekit.service";
import { getIO } from "./communication.socket";
import { redis } from "@/config/redis";
import { v4 as uuidv4 } from "uuid";
import { NotificationService } from "@/modules/notifications/notification.service";

async function getProfileName(userId: string): Promise<string> {
  const result = await query(
    "SELECT full_name FROM profiles WHERE user_id = $1",
    [userId]
  );
  return result.rows[0]?.full_name || 'User';
}

export class FocusService {
  static async startFocus(userId: string, conversationId: string, durationSeconds: number) {
    const partnerId = await MessageService.validateMatchAndGetPartner(conversationId, userId);

    const active = await CommunicationRepository.getActiveFocus(conversationId);
    if (active) {
      throw new AppError("There is already an active focus session in this conversation", 400);
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const roomName = `communication_focus_${uuidv4()}`;
      const focus = await CommunicationRepository.createFocus(client, conversationId, userId, durationSeconds, roomName);
      
      await client.query("COMMIT");

      // Generate a LiveKit token for the initiator so they can join the room immediately
      const initiatorName = await getProfileName(userId);
      const token = await LiveKitService.generateToken(roomName, initiatorName, userId);
      const url = LiveKitService.getLiveKitUrl();

      const io = getIO();
      const payload = {
        conversationId,
        timestamp: new Date(focus.created_at).getTime(),
        eventId: uuidv4(),
        focusId: focus.id,
        initiatorId: userId,
        durationSeconds,
        roomName
      };
      
      io.to(`user_${partnerId}`).emit("incoming_focus_session", payload);

      NotificationService.sendToUser(
        partnerId,
        "Focus Session",
        `${initiatorName} invited you to a focus session`,
        { type: "incoming_focus_session", conversationId, focusId: focus.id, roomName },
        "high"
      ).catch(err => console.error("Push error", err));

      return { ...focus, token, url };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async acceptFocus(userId: string, focusId: string, participantName: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const focus = await CommunicationRepository.getFocusByIdForUpdate(client, focusId);
      if (!focus) throw new AppError("Focus session not found", 404);
      
      await MessageService.validateMatchAndGetPartner(focus.conversation_id, userId);

      if (focus.status === 'COMPLETED' || focus.status === 'CANCELLED') {
        throw new AppError(`Cannot accept focus session. Status is ${focus.status}`, 400);
      }

      let updated = focus;
      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + focus.duration_seconds * 1000);

      if (focus.status === 'PENDING') {
        updated = await CommunicationRepository.updateFocusStatus(client, focusId, 'ACTIVE', startedAt, endsAt);
      }
      
      await client.query("COMMIT");

      // Update presence for both participants
      if (focus.status === 'PENDING') {
        await redis.set(`presence:${focus.initiator_id}`, "IN_FOCUS");
        await redis.set(`presence:${userId}`, "IN_FOCUS");
      }

      // Generate token for the joiner who is accepting
      const token = await LiveKitService.generateToken(focus.room_name, participantName, userId);
      const url = LiveKitService.getLiveKitUrl();

      // Only notify initiator if we actually transitioned state (prevent spam on idempotent calls)
      if (focus.status === 'PENDING') {
        const io = getIO();
        io.to(`user_${focus.initiator_id}`).emit("focus_accepted", {
          conversationId: focus.conversation_id,
          timestamp: new Date(updated.updated_at).getTime(),
          eventId: uuidv4(),
          focusId,
          endsAt: endsAt.toISOString(),
          status: 'ACTIVE'
        });
      }

      return { token, url, roomName: focus.room_name, endsAt: updated.ends_at };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async endFocus(userId: string, focusId: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const focus = await CommunicationRepository.getFocusByIdForUpdate(client, focusId);
      if (!focus) throw new AppError("Focus session not found", 404);
      
      const partnerId = await MessageService.validateMatchAndGetPartner(focus.conversation_id, userId);

      if (focus.status === 'COMPLETED' || focus.status === 'CANCELLED') {
        await client.query("ROLLBACK");
        return focus; // Already ended, idempotent
      }

      let reason = 'CANCELLED';
      if (focus.status === 'PENDING' && focus.initiator_id !== userId) {
        reason = 'REJECTED';
      }

      const updated = await CommunicationRepository.updateFocusStatus(client, focusId, 'CANCELLED'); // Status becomes cancelled regardless
      
      await client.query("COMMIT");

      // Restore presence to ONLINE for both participants (if still connected)
      const initiatorSocket = await redis.get(`socket:${userId}`);
      if (initiatorSocket) await redis.set(`presence:${userId}`, "ONLINE");
      const partnerSock = await redis.get(`socket:${partnerId}`);
      if (partnerSock) await redis.set(`presence:${partnerId}`, "ONLINE");

      const io = getIO();
      const payload = {
        conversationId: focus.conversation_id,
        timestamp: new Date(updated.updated_at).getTime(),
        eventId: uuidv4(),
        focusId,
        reason
      };
      
      io.to(`user_${userId}`).emit("focus_ended", payload);
      io.to(`user_${partnerId}`).emit("focus_ended", payload);

      return updated;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async getFocusHistory(userId: string, conversationId: string, cursor?: string) {
    await MessageService.validateMatchAndGetPartner(conversationId, userId);
    return CommunicationRepository.getFocusHistory(conversationId, cursor);
  }
}

