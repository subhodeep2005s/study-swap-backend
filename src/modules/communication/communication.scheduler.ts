import cron from "node-cron";
import { getIO } from "./communication.socket";
import { LiveKitService } from "./livekit.service";
import { logger } from "@/config/logger";
import { v4 as uuidv4 } from "uuid";
import { redis } from "@/config/redis";
import { CommunicationRepository } from "./communication.repository";
import { MessageService } from "./message.service";
import { NotificationService } from "@/modules/notifications/notification.service";

export function startCommunicationScheduler() {
  logger.info("Starting Communication Scheduler (node-cron)");
  
  cron.schedule("*/30 * * * * *", async () => {
    try {
      const lockKey = "communication:scheduler_lock";
      const lockAcquired = await redis.set(lockKey, "locked", "EX", 25, "NX");
      
      if (!lockAcquired) {
        return; // Lock not acquired, another PM2 instance is running it
      }

      logger.debug("Acquired communication scheduler cron lock");

      await processMissedCalls();
      await processCancelledFocus();
      await processCompletedFocus();
    } catch (err) {
      logger.error(err, "Error in communication scheduler");
    }
  });
}

async function processMissedCalls() {
  const calls = await CommunicationRepository.processMissedCalls();

  if (calls.length > 0) {
    const io = getIO();
    for (const call of calls) {
      io.to(`conv_${call.conversation_id}`).emit("call_ended", {
        conversationId: call.conversation_id,
        timestamp: Date.now(),
        eventId: uuidv4(),
        callId: call.id,
        reason: 'MISSED'
      });
      
      // Push Notification to Callee
      try {
        const partnerId = await MessageService.validateMatchAndGetPartner(call.conversation_id, call.caller_id);
        NotificationService.sendToUser(
          partnerId,
          "Missed Call",
          "You missed a call from your study partner",
          { type: "missed_call", conversationId: call.conversation_id, callId: call.id }
        ).catch(err => logger.error(err, "Missed call push error"));
      } catch (err) {
        logger.error(err, "Failed to send missed call push notification");
      }
      // Optionally delete the LiveKit room if it was created
      try {
        await LiveKitService.deleteRoom(call.room_name);
      } catch (err) {
        // Room might not exist yet if no one joined
      }
    }
  }
}

async function processCancelledFocus() {
  const focuses = await CommunicationRepository.processCancelledFocus();

  if (focuses.length > 0) {
    const io = getIO();
    for (const focus of focuses) {
      io.to(`conv_${focus.conversation_id}`).emit("focus_ended", {
        conversationId: focus.conversation_id,
        timestamp: Date.now(),
        eventId: uuidv4(),
        focusId: focus.id,
        reason: 'CANCELLED'
      });
    }
  }
}

async function processCompletedFocus() {
  const focuses = await CommunicationRepository.processCompletedFocus();

  if (focuses.length > 0) {
    const io = getIO();
    for (const focus of focuses as any[]) {
      io.to(`conv_${focus.conversation_id}`).emit("focus_ended", {
        conversationId: focus.conversation_id,
        timestamp: Date.now(),
        eventId: uuidv4(),
        focusId: focus.id,
        reason: 'COMPLETED'
      });
      
      // Reset presence
      const u1Socket = await redis.get(`socket:${focus.user1}`);
      if (u1Socket) await redis.set(`presence:${focus.user1}`, "ONLINE");
      const u2Socket = await redis.get(`socket:${focus.user2}`);
      if (u2Socket) await redis.set(`presence:${focus.user2}`, "ONLINE");
    }
  }
}
