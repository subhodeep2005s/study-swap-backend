import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import { HallOfFameService } from "./hall-of-fame.service";
import type { CreateCommentInput, UpdateCommentInput } from "./hall-of-fame.schema";

export const getPublicStories = asyncHandler(async (req: Request, res: Response) => {
  const result = await HallOfFameService.getPublicStories(req.query as any);
  res.status(200).json({ success: true, message: "Stories fetched", data: result.data, nextCursor: result.nextCursor });
});

export const getStoryById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const story = await HallOfFameService.getPublicStoryById(req.params.id, req.user?.id);
  res.status(200).json({ success: true, message: "Story fetched", data: story });
});

export const getFeaturedStories = asyncHandler(async (_req: Request, res: Response) => {
  const stories = await HallOfFameService.getFeaturedStories();
  res.status(200).json({ success: true, message: "Featured stories fetched", data: stories });
});

export const getTrendingStories = asyncHandler(async (_req: Request, res: Response) => {
  const result = await HallOfFameService.getTrendingStories();
  res.status(200).json({ success: true, message: "Trending stories fetched", data: result.data });
});

export const getRecommendedStories = asyncHandler(async (req: Request, res: Response) => {
  const stories = await HallOfFameService.getRecommendedStories(req.user!.id);
  res.status(200).json({ success: true, message: "Recommended stories fetched", data: stories });
});

export const getFilters = asyncHandler(async (_req: Request, res: Response) => {
  const filters = await HallOfFameService.getFilters();
  res.status(200).json({ success: true, message: "Filters fetched", data: filters });
});

export const recordView = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.recordView(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "View recorded", data: {} });
});

export const likeStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.likeStory(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "Story liked", data: {} });
});

export const unlikeStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.unlikeStory(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "Story unliked", data: {} });
});

export const markHelpful = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.markHelpful(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "Story marked as helpful", data: {} });
});

export const unmarkHelpful = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.unmarkHelpful(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "Helpful mark removed", data: {} });
});

export const saveStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.saveStory(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "Story saved", data: {} });
});

export const unsaveStory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await HallOfFameService.unsaveStory(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "Story unsaved", data: {} });
});

export const getSavedStories = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const result = await HallOfFameService.getSavedStories(req.user!.id, limit, req.query.cursor as string);
  res.status(200).json({ success: true, message: "Saved stories fetched", data: result.data, nextCursor: result.nextCursor });
});

export const getComments = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const result = await HallOfFameService.getComments(req.params.id, limit, req.query.cursor as string);
  res.status(200).json({ success: true, message: "Comments fetched", data: result.data, nextCursor: result.nextCursor });
});

export const createComment = asyncHandler(async (req: Request<{ id: string }, unknown, CreateCommentInput>, res: Response) => {
  const comment = await HallOfFameService.createComment(req.params.id, req.user!.id, req.body);
  res.status(201).json({ success: true, message: "Comment created", data: comment });
});

export const updateComment = asyncHandler(async (req: Request<{ commentId: string }, unknown, UpdateCommentInput>, res: Response) => {
  const comment = await HallOfFameService.updateComment(req.params.commentId, req.user!.id, req.body);
  res.status(200).json({ success: true, message: "Comment updated", data: comment });
});

export const deleteComment = asyncHandler(async (req: Request<{ id: string, commentId: string }>, res: Response) => {
  await HallOfFameService.deleteComment(req.params.commentId, req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: "Comment deleted", data: {} });
});
