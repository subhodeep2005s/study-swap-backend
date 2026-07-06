import type { Request, Response } from "express";
import { MessageService } from "./message.service";

export class MessageController {
  static async getMessages(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const conversationId = req.params.conversationId as string;
    const cursor = req.query.cursor as string | undefined;

    const messages = await MessageService.getMessages(userId, conversationId, cursor);
    res.json({ success: true, message: "Messages fetched successfully", data: messages });
  }

  static async getAttachments(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const conversationId = req.params.conversationId as string;
    const cursor = req.query.cursor as string | undefined;

    const attachments = await MessageService.getAttachments(userId, conversationId, cursor);
    res.json({ success: true, message: "Attachments fetched successfully", data: attachments });
  }

  static async sendMessage(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const conversationId = req.params.conversationId as string;
    const { messageType, message, replyToMessageId, attachment } = req.body as any;

    const saved = await MessageService.sendMessage(
      userId, conversationId, messageType, message, replyToMessageId, attachment
    );
    res.status(201).json({ success: true, message: "Message sent successfully", data: saved });
  }

  static async editMessage(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const messageId = req.params.messageId as string;
    const { message } = req.body as any;

    const updated = await MessageService.editMessage(userId, messageId, message);
    res.json({ success: true, message: "Message edited successfully", data: updated });
  }

  static async deleteMessage(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const messageId = req.params.messageId as string;

    const deleted = await MessageService.deleteMessage(userId, messageId);
    res.json({ success: true, message: "Message deleted successfully", data: deleted });
  }

  static async markRead(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const conversationId = req.params.conversationId as string;

    await MessageService.markRead(userId, conversationId);
    res.json({ success: true, message: "Messages marked as read" });
  }
}
