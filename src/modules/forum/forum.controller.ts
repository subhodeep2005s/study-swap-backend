import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import { ForumService } from "./forum.service";
import type { 
  GenerateProfileBody, UpdateProfileBody, CreatePostBody, CreateCommentBody, 
  ReportBody, VotePollBody, BlockProfileBody 
} from "./forum.schema";

export const getProfile = asyncHandler(async (req: Request<{}, {}, GenerateProfileBody>, res: Response) => {
  const profile = await ForumService.getOrCreateProfile(req.user!.id, req.body.avatarKey, req.body.avatarUrl);
  res.status(200).json({ success: true, data: profile });
});

export const fetchProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await ForumService.getOrCreateProfile(req.user!.id);
  res.status(200).json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req: Request<{}, {}, UpdateProfileBody>, res: Response) => {
  const profile = await ForumService.updateProfile(req.user!.id, req.body);
  res.status(200).json({ success: true, data: profile });
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await ForumService.getCategories();
  res.status(200).json({ success: true, data: categories });
});

export const createPost = asyncHandler(async (req: Request<{}, {}, CreatePostBody>, res: Response) => {
  const postId = await ForumService.createPost(req.user!.id, req.body);
  res.status(201).json({ success: true, message: "Post created successfully", data: { id: postId } });
});

export const getPost = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const post = await ForumService.getPostDetails(req.params.id, req.user!.id);
  res.status(200).json({ success: true, data: post });
});

export const listPosts = asyncHandler(async (req: Request<{}, {}, {}, { categoryId?: string, cursor?: string, limit?: string, sortBy?: string }>, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const posts = await ForumService.listPosts(req.user!.id, req.query.categoryId, req.query.cursor, limit, req.query.sortBy);
  res.status(200).json({ success: true, data: posts });
});

export const listSavedPosts = asyncHandler(async (req: Request<{}, {}, {}, { cursor?: string, limit?: string }>, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const posts = await ForumService.listSavedPosts(req.user!.id, req.query.cursor, limit);
  res.status(200).json({ success: true, data: posts });
});

export const createComment = asyncHandler(async (req: Request<{ id: string }, {}, CreateCommentBody>, res: Response) => {
  const comment = await ForumService.createComment(req.user!.id, req.params.id, req.body.content, req.body.parentCommentId);
  res.status(201).json({ success: true, data: comment });
});

export const listComments = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const comments = await ForumService.listComments(req.params.id, req.user!.id);
  res.status(200).json({ success: true, data: comments });
});

export const toggleLike = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const result = await ForumService.toggleLikePost(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const toggleSave = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const result = await ForumService.toggleSavePost(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const votePoll = asyncHandler(async (req: Request<{ id: string }, {}, VotePollBody>, res: Response) => {
  await ForumService.votePoll(req.user!.id, req.params.id, req.body.optionId);
  res.status(200).json({ success: true, message: "Vote recorded" });
});

export const reportContent = asyncHandler(async (req: Request<{}, {}, ReportBody>, res: Response) => {
  await ForumService.reportContent(req.user!.id, req.body.targetType, req.body.targetId, req.body.reason, req.body.details);
  res.status(200).json({ success: true, message: "Report submitted successfully" });
});

export const blockProfile = asyncHandler(async (req: Request<{}, {}, BlockProfileBody>, res: Response) => {
  await ForumService.blockProfile(req.user!.id, req.body.profileId);
  res.status(200).json({ success: true, message: "Profile blocked" });
});
