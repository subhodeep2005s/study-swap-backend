import { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import { AIRepository } from "./ai.repository";
import { AIService } from "./ai.service";
import { AppError } from "@/core/errors/AppError";

export const aiController = {
  getConversations: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const conversations = await AIRepository.getConversations(userId);
    res.json({ success: true, data: conversations });
  }),

  createConversation: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { title } = req.body;
    if (!title) throw new AppError("Title is required", 400);

    const conversation = await AIRepository.createConversation(userId, title);
    res.json({ success: true, data: conversation });
  }),

  deleteConversation: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    await AIRepository.deleteConversation(id, userId);
    res.json({ success: true, message: "Conversation deleted" });
  }),

  getMessages: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { limit, cursor } = req.query;

    const conversation = await AIRepository.getConversation(id);
    if (!conversation || conversation.user_id !== userId) {
      throw new AppError("Conversation not found", 404);
    }

    const cursorDate = cursor ? new Date(cursor as string) : undefined;
    const messages = await AIRepository.getMessages(id, limit ? parseInt(limit as string) : 20, cursorDate);
    
    res.json({ success: true, data: messages });
  }),

  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { content } = req.body;

    if (!content) throw new AppError("Message content is required", 400);

    const conversation = await AIRepository.getConversation(id);
    if (!conversation || conversation.user_id !== userId) {
      throw new AppError("Conversation not found", 404);
    }

    const response = await AIService.sendMessage(userId, id, content);
    res.json({ success: true, data: response });
  }),

  getTodayRoutine: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const dateStr = new Date().toISOString().split("T")[0];
    
    const progress = await AIRepository.getDailyProgress(userId, dateStr as string);
    res.json({ success: true, data: progress || { plan: null, tasks: [] } });
  }),

  updateTaskStatus: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { status } = req.body; // 'completed' | 'skipped' | 'rescheduled' | 'pending'

    if (!['completed', 'skipped', 'rescheduled', 'pending'].includes(status)) {
      throw new AppError("Invalid status", 400);
    }

    const updated = await AIRepository.updateTaskStatus(id, userId, status as any);
    res.json({ success: true, data: updated });
  })
};
