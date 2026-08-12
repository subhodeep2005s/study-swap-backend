import { HallOfFameRepository } from "./hall-of-fame.repository";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/core/errors/AppError";
import { getS3ObjectUrl } from "@/config/s3";
import type { 
  AdminHallOfFameFilters, 
  PublicHallOfFameFilters,
  CreateHallOfFameInput,
  UpdateHallOfFameInput,
  CreateCommentInput,
  UpdateCommentInput
} from "./hall-of-fame.types";

const formatStoryWithUrls = (story: any) => {
  if (!story) return story;
  const formatted = { ...story };
  if (formatted.media_key) {
    formatted.media_url = getS3ObjectUrl(formatted.media_key);
    delete formatted.media_key;
  }
  if (formatted.thumbnail_key) {
    formatted.thumbnail_url = getS3ObjectUrl(formatted.thumbnail_key);
    delete formatted.thumbnail_key;
  }
  return formatted;
};

export class HallOfFameService {

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================
  
  static async createStory(adminId: string, data: CreateHallOfFameInput) {
    try {
      return await HallOfFameRepository.createStory(adminId, data);
    } catch (e: any) {
      if (e.code === '23503') {
        throw new BadRequestError(`Referenced entity does not exist: ${e.detail}`);
      }
      throw e;
    }
  }

  static async updateStory(id: string, data: UpdateHallOfFameInput) {
    const story = await HallOfFameRepository.getStoryById(id);
    if (!story) throw new NotFoundError("Story not found");

    try {
      return await HallOfFameRepository.updateStory(id, data, false);
    } catch (e: any) {
      if (e.code === '23503') {
        throw new BadRequestError(`Referenced entity does not exist: ${e.detail}`);
      }
      throw e;
    }
  }

  static async deleteStory(id: string, adminId: string) {
    const deleted = await HallOfFameRepository.deleteStory(id, adminId);
    if (!deleted) throw new NotFoundError("Story not found or already deleted");
    return true;
  }

  static async restoreStory(id: string) {
    const restored = await HallOfFameRepository.restoreStory(id);
    if (!restored) throw new NotFoundError("Story not found");
    return true;
  }

  static async publishStory(id: string) {
    const story = await HallOfFameRepository.getStoryById(id);
    if (!story) throw new NotFoundError("Story not found");
    if (story.deleted_at) throw new BadRequestError("Cannot publish a deleted story");
    
    // Add business logic for publishing
    if (!story.country_id || !story.achievement_type || !story.achievement_year) {
      throw new BadRequestError("Missing required fields for publishing");
    }

    return await HallOfFameRepository.updateStory(id, { status: 'PUBLISHED' }, true);
  }

  static async unpublishStory(id: string) {
    const story = await HallOfFameRepository.getStoryById(id);
    if (!story) throw new NotFoundError("Story not found");
    
    return await HallOfFameRepository.updateStory(id, { status: 'DRAFT' });
  }

  static async featureStory(id: string) {
    const story = await HallOfFameRepository.getStoryById(id);
    if (!story) throw new NotFoundError("Story not found");
    if (story.status !== 'PUBLISHED') throw new BadRequestError("Only published stories can be featured");
    if (story.deleted_at) throw new BadRequestError("Cannot feature a deleted story");

    await HallOfFameRepository.setFeatured(id, true);
    return true;
  }

  static async unfeatureStory(id: string) {
    const featured = await HallOfFameRepository.setFeatured(id, false);
    if (!featured) throw new NotFoundError("Story not found");
    return true;
  }

  static async getAdminStories(filters: AdminHallOfFameFilters) {
    const result = await HallOfFameRepository.getAdminStories(filters);
    return { ...result, data: result.data.map(formatStoryWithUrls) };
  }
  
  static async getAdminStoryById(id: string) {
    const story = await HallOfFameRepository.getStoryById(id);
    if (!story) throw new NotFoundError("Story not found");
    return formatStoryWithUrls(story);
  }

  static async adminDeleteComment(commentId: string, storyId: string, adminId: string) {
    const deleted = await HallOfFameRepository.deleteComment(commentId, storyId, adminId);
    if (!deleted) throw new NotFoundError("Comment not found");
    return true;
  }

  static async getAdminStats() {
    return await HallOfFameRepository.getAdminStats();
  }

  // ============================================================================
  // PUBLIC OPERATIONS
  // ============================================================================

  static async getPublicStories(filters: PublicHallOfFameFilters) {
    const result = await HallOfFameRepository.getPublicStories(filters);
    return { ...result, data: result.data.map(formatStoryWithUrls) };
  }

  static async getPublicStoryById(id: string, userId?: string) {
    const story = await HallOfFameRepository.getStoryById(id);
    if (!story || story.deleted_at || story.status !== 'PUBLISHED') {
      throw new NotFoundError("Story not found");
    }

    if (userId) {
      const viewerState = await HallOfFameRepository.getUserInteractions(id, userId);
      story.viewer = viewerState;
    } else {
      story.viewer = { liked: false, helpful: false, saved: false };
    }

    return formatStoryWithUrls(story);
  }

  static async getFeaturedStories() {
    const stories = await HallOfFameRepository.getFeaturedStories();
    return stories.map(formatStoryWithUrls);
  }

  static async getTrendingStories() {
    const result = await HallOfFameRepository.getPublicStories({ sort: 'trending', limit: 20 });
    return { ...result, data: result.data.map(formatStoryWithUrls) };
  }

  static async getFilters() {
    return await HallOfFameRepository.getFilters();
  }

  static async getRecommendedStories(userId: string) {
    const stories = await HallOfFameRepository.getRecommendedStories(userId, 20);
    return stories.map(formatStoryWithUrls);
  }

  // ============================================================================
  // INTERACTIONS
  // ============================================================================

  static async recordView(storyId: string, userId: string) {
    const story = await HallOfFameRepository.getStoryById(storyId);
    if (!story || story.status !== 'PUBLISHED' || story.deleted_at) throw new NotFoundError("Story not found");
    return await HallOfFameRepository.recordView(storyId, userId);
  }

  static async likeStory(storyId: string, userId: string) {
    return await HallOfFameRepository.likeStory(storyId, userId);
  }

  static async unlikeStory(storyId: string, userId: string) {
    return await HallOfFameRepository.unlikeStory(storyId, userId);
  }

  static async markHelpful(storyId: string, userId: string) {
    return await HallOfFameRepository.markHelpful(storyId, userId);
  }

  static async unmarkHelpful(storyId: string, userId: string) {
    return await HallOfFameRepository.unmarkHelpful(storyId, userId);
  }

  static async saveStory(storyId: string, userId: string) {
    return await HallOfFameRepository.saveStory(storyId, userId);
  }

  static async unsaveStory(storyId: string, userId: string) {
    return await HallOfFameRepository.unsaveStory(storyId, userId);
  }

  static async getSavedStories(userId: string, limit: number = 20, cursor?: string) {
    // Basic pagination for now
    const page = cursor ? parseInt(cursor, 10) : 1;
    const offset = (page - 1) * limit;
    const stories = await HallOfFameRepository.getSavedStories(userId, limit, offset);
    return { data: stories.map(formatStoryWithUrls), nextCursor: stories.length === limit ? String(page + 1) : null };
  }

  // ============================================================================
  // COMMENTS
  // ============================================================================

  static async getComments(storyId: string, limit: number = 20, cursor?: string) {
    const page = cursor ? parseInt(cursor, 10) : 1;
    const offset = (page - 1) * limit;
    const comments = await HallOfFameRepository.getComments(storyId, limit, offset);
    return { data: comments, nextCursor: comments.length === limit ? String(page + 1) : null };
  }

  static async createComment(storyId: string, userId: string, data: CreateCommentInput) {
    const story = await HallOfFameRepository.getStoryById(storyId);
    if (!story || story.status !== 'PUBLISHED' || story.deleted_at) throw new NotFoundError("Story not found");
    
    if (data.parent_comment_id) {
      const parent = await HallOfFameRepository.getCommentById(data.parent_comment_id);
      if (!parent || parent.hall_of_fame_id !== storyId) {
        throw new BadRequestError("Invalid parent comment");
      }
    }

    return await HallOfFameRepository.createComment(storyId, userId, data);
  }

  static async updateComment(commentId: string, userId: string, data: UpdateCommentInput) {
    const comment = await HallOfFameRepository.getCommentById(commentId);
    if (!comment) throw new NotFoundError("Comment not found");
    if (comment.user_id !== userId) throw new ForbiddenError("Cannot edit someone else's comment");

    return await HallOfFameRepository.updateComment(commentId, data.content);
  }

  static async deleteComment(commentId: string, storyId: string, userId: string) {
    const comment = await HallOfFameRepository.getCommentById(commentId);
    if (!comment) throw new NotFoundError("Comment not found");
    if (comment.user_id !== userId) throw new ForbiddenError("Cannot delete someone else's comment");

    const deleted = await HallOfFameRepository.deleteComment(commentId, storyId, userId);
    return deleted;
  }

  static async adminGetComments(storyId: string, limit: number = 20, cursor?: string) {
    const page = cursor ? parseInt(cursor, 10) : 1;
    const offset = (page - 1) * limit;
    const comments = await HallOfFameRepository.getComments(storyId, limit, offset);
    return { data: comments, nextCursor: comments.length === limit ? String(page + 1) : null };
  }
}
