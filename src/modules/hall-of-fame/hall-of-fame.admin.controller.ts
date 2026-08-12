import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import { HallOfFameService } from "./hall-of-fame.service";
import type { CreateHallOfFameInput, UpdateHallOfFameInput } from "./hall-of-fame.types";

export const getAdminStories = asyncHandler(async (req: Request, res: Response) => {
  const result = await HallOfFameService.getAdminStories(req.query as any);
  res.status(200).json({ success: true, message: "Stories fetched", data: result.data, total: result.total });
});

export const getAdminStoryById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const story = await HallOfFameService.getAdminStoryById(req.params.id);
  res.status(200).json({ success: true, message: "Story fetched", data: story });
});

export const createStory = asyncHandler(async (req: Request<unknown, unknown, CreateHallOfFameInput>, res: Response) => {
  const story = await HallOfFameService.createStory(req.user!.id, req.body);
  res.status(201).json({ success: true, message: "Story created", data: story });
});

export const updateStory = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateHallOfFameInput>, res: Response) => {
  const story = await HallOfFameService.updateStory(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Story updated", data: story });
});

export const deleteStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.deleteStory(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "Story deleted", data: {} });
});

export const restoreStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.restoreStory(req.params.id);
  res.status(200).json({ success: true, message: "Story restored", data: {} });
});

export const publishStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.publishStory(req.params.id);
  res.status(200).json({ success: true, message: "Story published", data: {} });
});

export const unpublishStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.unpublishStory(req.params.id);
  res.status(200).json({ success: true, message: "Story unpublished", data: {} });
});

export const featureStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.featureStory(req.params.id);
  res.status(200).json({ success: true, message: "Story featured", data: {} });
});

export const unfeatureStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.unfeatureStory(req.params.id);
  res.status(200).json({ success: true, message: "Story unfeatured", data: {} });
});

export const adminGetComments = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const result = await HallOfFameService.adminGetComments(req.params.id, limit, req.query.cursor as string);
  res.status(200).json({ success: true, message: "Comments fetched", data: result.data, nextCursor: result.nextCursor });
});

export const adminDeleteComment = asyncHandler(async (req: Request<{ id: string, commentId: string }>, res: Response) => {
  await HallOfFameService.adminDeleteComment(req.params.commentId, req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "Comment deleted", data: {} });
});

export const getAdminStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await HallOfFameService.getAdminStats();
  res.status(200).json({ success: true, message: "Stats fetched", data: stats });
});
