import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "@/config/redis";
import { verifyToken } from "@/core/utils/jwt";
import { logger } from "@/config/logger";
import { AppError } from "@/core/errors/AppError";
import type { AuthenticatedSocket } from "@/types/socket";
import { CommunicationRepository } from "./communication.repository";

let io: SocketIOServer;

export async function initSocketIO(server: any) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Or use env.CORS_ORIGINS
      credentials: true
    }
  });

  // Use Redis adapter for multi-instance scaling
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  try {
    // Satisfy the requirement for calling connect (node-redis requires it, ioredis connects automatically but we can wait for ready)
    if (typeof pubClient.connect === 'function' && pubClient.status === 'wait') {
      await pubClient.connect();
      await subClient.connect();
    }
  } catch (e) { /* ignore */ }
  io.adapter(createAdapter(pubClient, subClient));

  // Middleware for Authentication
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = verifyToken(token);
      (socket as AuthenticatedSocket).userId = decoded?.id as string;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (baseSocket) => {
    const socket = baseSocket as AuthenticatedSocket;
    const userId = socket.userId;
    logger.info(`User connected to socket: ${userId} (${socket.id})`);

    // Store socket ID and presence in Redis
    await redis.set(`socket:${userId}`, socket.id);
    await redis.set(`presence:${userId}`, "ONLINE");
    // Remove lastSeen when online
    await redis.del(`lastSeen:${userId}`);

    // Join personal room for direct user-to-user events (e.g. incoming call)
    socket.join(`user_${userId}`);

    // Helper to validate conversation membership
    const validateMembership = async (conversationId: string): Promise<boolean> => {
      return CommunicationRepository.validateMembership(conversationId, userId);
    };

    // Handle typing events
    socket.on("typing", async (payload: { conversationId: string, timestamp: number, eventId: string }) => {
      if (!(await validateMembership(payload.conversationId))) return;
      
      // Add user to typing set
      await redis.sadd(`typing:${payload.conversationId}`, userId);
      // Expire typing state automatically after 5 seconds to prevent stuck typing indicators
      await redis.expire(`typing:${payload.conversationId}`, 5);
      
      // Broadcast to others in the conversation room
      socket.to(`conv_${payload.conversationId}`).emit("typing", {
        userId,
        conversationId: payload.conversationId,
        timestamp: payload.timestamp,
        eventId: payload.eventId
      });
    });

    socket.on("stop_typing", async (payload: { conversationId: string, timestamp: number, eventId: string }) => {
      if (!(await validateMembership(payload.conversationId))) return;
      
      await redis.srem(`typing:${payload.conversationId}`, userId);
      socket.to(`conv_${payload.conversationId}`).emit("stop_typing", {
        userId,
        conversationId: payload.conversationId,
        timestamp: payload.timestamp,
        eventId: payload.eventId
      });
    });

    socket.on("join_conversation", async (payload: any) => {
      const conversationId = typeof payload === "string" ? payload : payload.conversationId;
      if (!conversationId || !(await validateMembership(conversationId))) return;
      socket.join(`conv_${conversationId}`);
    });

    socket.on("leave_conversation", async (payload: any) => {
      const conversationId = typeof payload === "string" ? payload : payload.conversationId;
      if (!conversationId || !(await validateMembership(conversationId))) return;
      socket.leave(`conv_${conversationId}`);
    });

    socket.on("disconnect", async () => {
      logger.info(`User disconnected: ${userId} (${socket.id})`);
      await redis.del(`socket:${userId}`);
      await redis.del(`presence:${userId}`);
      await redis.set(`lastSeen:${userId}`, new Date().toISOString(), "EX", 604800); // 7 days
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new AppError("Socket.IO has not been initialized", 500);
  }
  return io;
}
