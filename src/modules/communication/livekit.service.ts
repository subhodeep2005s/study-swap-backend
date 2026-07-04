import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env } from "@/config/env";
import { AppError } from "@/core/errors/AppError";

export class LiveKitService {
  /**
   * Generates a short-lived access token strictly scoped to a specific room.
   */
  static async generateToken(roomName: string, participantName: string, participantId: string): Promise<string> {
    if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.LIVEKIT_WS_URL) {
      throw new AppError("LiveKit is not configured on this server.", 501);
    }

    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: participantId,
      name: participantName,
      // Tokens expire after exactly 1 hour
      ttl: "1h",
    });

    at.addGrant({ 
      roomJoin: true, 
      room: roomName,
      canPublish: true,
      canSubscribe: true 
    });

    return await at.toJwt();
  }

  static getLiveKitUrl(): string {
    if (!env.LIVEKIT_WS_URL) {
      throw new AppError("LiveKit is not configured on this server.", 501);
    }
    return env.LIVEKIT_WS_URL;
  }

  static async deleteRoom(roomName: string): Promise<void> {
    if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.LIVEKIT_WS_URL) {
      return;
    }
    
    // LiveKit HTTP URL is often derived from WS URL. 
    // Usually wss:// becomes https://
    const httpUrl = env.LIVEKIT_API_URL || env.LIVEKIT_WS_URL.replace("wss://", "https://").replace("ws://", "http://");
    const svc = new RoomServiceClient(httpUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    await svc.deleteRoom(roomName);
  }
}
