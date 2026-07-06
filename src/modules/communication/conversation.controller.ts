import type { Request, Response } from "express";
import { CommunicationRepository } from "./communication.repository";
import { redis } from "@/config/redis";
import { MessageService } from "./message.service";

export class ConversationController {
  static async getConversationsList(req: Request, res: Response) {
    const userId = req.user!.id;
    const conversations = await CommunicationRepository.getConversationsList(userId);
    
    const enhanced = await Promise.all(conversations.map(async (c: any) => {
      const presence = await redis.get(`presence:${c.partnerId}`);
      const lastSeen = await redis.get(`lastSeen:${c.partnerId}`);
      
      return {
        conversationId: c.conversationId,
        match: { id: c.matchId, status: c.matchStatus },
        lastMessage: {
          id: c.lastMessageId,
          type: c.lastMessageType,
          text: c.lastMessageText,
          senderId: c.lastMessageSenderId
        },
        lastMessageAt: c.lastMessageAt,
        unreadCount: parseInt(c.unreadCount, 10),
        partner: {
          id: c.partnerId,
          fullName: c.partnerName,
          profileImage: c.partnerImage
        },
        partnerPresence: presence || 'OFFLINE',
        partnerLastSeen: lastSeen || null
      };
    }));

    res.json({ success: true, message: "Conversations fetched successfully", data: enhanced });
  }

  static async getConversation(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const conversationId = req.params.conversationId as string;
    await MessageService.validateMatchAndGetPartner(conversationId, userId);
    
    const conv = await CommunicationRepository.getConversation(conversationId);
    res.json({ success: true, message: "Conversation fetched successfully", data: conv });
  }
}
