import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as storiesService from "./stories.service";
import type { StoryInput, ViewStoryParams } from "./stories.schema";

export const uploadStory = asyncHandler(async (req: Request<unknown, unknown, StoryInput>, res: Response) => {
  await storiesService.uploadStory(req.user!.id, req.body.imageUrl);
  res.status(200).json({ success: true, message: "Story uploaded successfully.", data: {} });
});

export const deleteStory = asyncHandler(async (req: Request, res: Response) => {
  await storiesService.deleteStory(req.user!.id);
  res.status(200).json({ success: true, message: "Story deleted successfully.", data: {} });
});

export const viewStory = asyncHandler(async (req: Request<ViewStoryParams>, res: Response) => {
  await storiesService.recordView(req.user!.id, req.params.userId);
  res.status(200).json({ success: true, message: "Story view recorded.", data: {} });
});

export const getStoryViews = asyncHandler(async (req: Request, res: Response) => {
  const views = await storiesService.getStoryViews(req.user!.id);
  res.status(200).json({ success: true, message: "Story views fetched successfully.", data: views });
});

export const getMyStory = asyncHandler(async (req: Request, res: Response) => {
  const stories = await storiesService.getStories([req.user!.id]);
  const url = stories[req.user!.id];
  
  if (url) {
    res.status(200).json({ success: true, message: "Story found.", data: { hasStory: true, url } });
  } else {
    res.status(200).json({ success: true, message: "No story found.", data: { hasStory: false } });
  }
});
