import { getClient, query } from "@/config/db";
import { AppError } from "@/core/errors/AppError";
import { CommunicationRepository } from "./communication.repository";
import { MessageService } from "./message.service";
import { LiveKitService } from "./livekit.service";
import { getIO } from "./communication.socket";
import { redis } from "@/config/redis";
import { v4 as uuidv4 } from "uuid";
import { NotificationService } from "@/modules/notifications/notification.service";

async function getProfileInfo(userId: string): Promise<{name: string, image: string | null}> {
  const result = await query(
    "SELECT full_name, profile_image FROM profiles WHERE user_id = $1",
    [userId]
  );
  return {
    name: result.rows[0]?.full_name || 'User',
    image: result.rows[0]?.profile_image || null
  };
}

export class CallService {
  static async startCall(userId: string, conversationId: string, type: 'VOICE' | 'VIDEO') {
    const partnerId = await MessageService.validateMatchAndGetPartner(conversationId, userId);

    // 1. Check if there is already an active call
    const activeCall = await CommunicationRepository.getActiveCall(conversationId);
    if (activeCall) {
      throw new AppError("There is already an active call in this conversation", 400);
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const roomName = `communication_call_${uuidv4()}`;
      const call = await CommunicationRepository.createCall(client, conversationId, userId, type, roomName);

      await client.query("COMMIT");

      // Generate a LiveKit token for the caller so they can join the room immediately
      const callerInfo = await getProfileInfo(userId);
      const token = await LiveKitService.generateToken(roomName, callerInfo.name, userId);
      const url = LiveKitService.getLiveKitUrl();

      // Emit after commit
      const io = getIO();
      const payload = {
        conversationId,
        timestamp: new Date(call.created_at).getTime(),
        eventId: uuidv4(),
        callId: call.id,
        callerId: userId,
        type,
        roomName,
        partnerName: callerInfo.name,
        partnerImage: callerInfo.image
      };
      
      io.to(`user_${partnerId}`).emit("incoming_call", payload);

      NotificationService.sendToUser(
        partnerId,
        "Incoming Call",
        `${callerInfo.name} is calling you`,
        { type: "incoming_call", conversationId, callId: call.id, roomName },
        "high" // high priority for incoming calls
      ).catch(err => console.error("Push error", err));

      return { ...call, token, url };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async acceptCall(userId: string, callId: string, participantName: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const call = await CommunicationRepository.getCallByIdForUpdate(client, callId);
      if (!call) throw new AppError("Call not found", 404);
      
      await MessageService.validateMatchAndGetPartner(call.conversation_id, userId);

      if (call.caller_id === userId) {
        throw new AppError("You cannot accept your own call", 400);
      }
      
      if (call.status === 'ENDED' || call.status === 'MISSED' || call.status === 'CANCELLED' || call.status === 'REJECTED') {
        throw new AppError(`Cannot accept call. Status is ${call.status}`, 400);
      }

      let updated = call;
      if (call.status === 'RINGING') {
        updated = await CommunicationRepository.updateCallStatus(client, callId, 'ACTIVE');
      }
      
      await client.query("COMMIT");

      // Update presence for both participants
      if (call.status === 'RINGING') {
        await redis.set(`presence:${call.caller_id}`, "IN_CALL");
        await redis.set(`presence:${userId}`, "IN_CALL");
      }

      // Generate token for the callee who is accepting
      const token = await LiveKitService.generateToken(call.room_name, participantName, userId);
      const url = LiveKitService.getLiveKitUrl();

      // Only notify caller if we actually transitioned state (prevent spam on idempotent calls)
      if (call.status === 'RINGING') {
        const io = getIO();
        io.to(`user_${call.caller_id}`).emit("call_accepted", {
          conversationId: call.conversation_id,
          timestamp: new Date(updated.updated_at).getTime(),
          eventId: uuidv4(),
          callId,
          status: 'ACTIVE'
        });
      }

      return { token, url, roomName: call.room_name };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async endCall(userId: string, callId: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const call = await CommunicationRepository.getCallByIdForUpdate(client, callId);
      if (!call) throw new AppError("Call not found", 404);
      
      const partnerId = await MessageService.validateMatchAndGetPartner(call.conversation_id, userId);

      if (call.status === 'ENDED' || call.status === 'MISSED' || call.status === 'CANCELLED' || call.status === 'REJECTED') {
        await client.query("ROLLBACK");
        return call; // Already ended, idempotent
      }

      let reason = 'COMPLETED';
      if (call.status === 'RINGING' && call.caller_id === userId) {
        reason = 'CANCELLED';
      } else if (call.status === 'RINGING' && call.caller_id !== userId) {
        reason = 'REJECTED';
      }

      const updated = await CommunicationRepository.updateCallStatus(client, callId, 'ENDED', reason);
      
      await client.query("COMMIT");

      // Restore presence to ONLINE for both participants (if still connected)
      const callerSocket = await redis.get(`socket:${userId}`);
      if (callerSocket) await redis.set(`presence:${userId}`, "ONLINE");
      const partnerSocket = await redis.get(`socket:${partnerId}`);
      if (partnerSocket) await redis.set(`presence:${partnerId}`, "ONLINE");

      const io = getIO();
      const payload = {
        conversationId: call.conversation_id,
        timestamp: new Date(updated.updated_at).getTime(),
        eventId: uuidv4(),
        callId,
        reason
      };
      
      io.to(`user_${userId}`).emit("call_ended", payload);
      io.to(`user_${partnerId}`).emit("call_ended", payload);

      return updated;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async getCallHistory(userId: string, conversationId: string, cursor?: string) {
    await MessageService.validateMatchAndGetPartner(conversationId, userId);
    return CommunicationRepository.getCallHistory(conversationId, cursor);
  }
}

