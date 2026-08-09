import { AppError } from "@/core/errors/AppError";
import { ForumRepository } from "./forum.repository";
import { NotificationService } from "../notifications/notification.service";
import crypto from "crypto";

const ANIMAL_POOL = [
  "Fox", "Panda", "Wolf", "Cat", "Owl", "Bear", "Tiger", "Rabbit", "Penguin", "Lion", "Koala"
];
const ADJECTIVE_POOL = [
  "Calm", "Curious", "Night", "Bright", "Sleepy", "Brave", "Happy", "Swift", "Silent", "Loyal"
];

export class ForumService {
  /**
   * Generates a unique anonymous profile for a user if they don't have one.
   */
  static async getOrCreateProfile(userId: string, requestedAvatarKey?: string, requestedAvatarUrl?: string): Promise<any> {
    let profile = await ForumRepository.getProfileByUserId(userId);
    if (profile) {
      // If we want to allow avatar updates later, we'd do it here. 
      // For now just return existing.
      return profile;
    }

    // Generate unique name
    let displayName = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const adj = ADJECTIVE_POOL[Math.floor(Math.random() * ADJECTIVE_POOL.length)];
      const animal = ANIMAL_POOL[Math.floor(Math.random() * ANIMAL_POOL.length)];
      displayName = `Anonymous ${adj} ${animal}`;
      
      const existing = await ForumRepository.getProfileByDisplayName(displayName);
      if (!existing) {
        isUnique = true;
      } else {
        // Fallback to random suffix if collision
        const suffix = crypto.randomBytes(2).toString("hex");
        displayName = `${displayName} ${suffix}`;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new AppError("Failed to generate unique anonymous identity. Please try again.", 500);
    }

    // Default avatar based on animal
    const animalName = displayName.split(" ").slice(-1)[0]?.toLowerCase() || "fox";
    const defaultAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${animalName}`; // Fallback avatar

    profile = await ForumRepository.createProfile(
      userId, 
      displayName, 
      requestedAvatarKey, 
      requestedAvatarUrl || defaultAvatarUrl
    );

    return profile;
  }

  static async updateProfile(userId: string, data: { displayName?: string, avatarKey?: string, avatarUrl?: string }) {
    await this.getOrCreateProfile(userId);
    
    if (data.displayName) {
      const existing = await ForumRepository.getProfileByDisplayName(data.displayName);
      if (existing && existing.user_id !== userId) {
        throw new AppError("Display name is already taken.", 400);
      }
    }
    
    return ForumRepository.updateProfile(userId, data);
  }

  static async getCategories() {
    return ForumRepository.getCategories();
  }

  static async createPost(
    userId: string, 
    data: {
      categoryId: string, type: string, title: string, content: string,
      media?: Array<{ objectKey: string; url: string; mimeType: string; size: number; type: string }>,
      poll?: { expiresInHours?: number; options: string[] }
    }
  ) {
    const profile = await this.getOrCreateProfile(userId);
    if (profile.is_banned) {
      throw new AppError("Your anonymous profile is banned from posting.", 403);
    }

    const postId = await ForumRepository.createPost(
      profile.id, data.categoryId, data.type, data.title, data.content, data.media, data.poll
    );
    return postId;
  }

  static async getPostDetails(postId: string, userId: string) {
    const post = await ForumRepository.getPostDetails(postId, userId);
    if (!post) {
      throw new AppError("Post not found", 404);
    }
    return post;
  }

  static async listPosts(userId: string, categoryId?: string, cursor?: string, limit?: number, sortBy: string = "new") {
    // Ensure profile exists so blocks work correctly
    await this.getOrCreateProfile(userId);
    return ForumRepository.listPosts(userId, categoryId, cursor, limit, false, sortBy);
  }

  static async listSavedPosts(userId: string, cursor?: string, limit?: number) {
    await this.getOrCreateProfile(userId);
    return ForumRepository.listPosts(userId, undefined, cursor, limit, true);
  }

  static async createComment(userId: string, postId: string, content: string, parentCommentId?: string) {
    const profile = await this.getOrCreateProfile(userId);
    if (profile.is_banned) {
      throw new AppError("Your anonymous profile is banned from commenting.", 403);
    }

    // Check post exists
    const post = await ForumRepository.getPostDetails(postId, userId);
    if (!post) throw new AppError("Post not found", 404);

    const comment = await ForumRepository.createComment(postId, profile.id, content, parentCommentId);

    // Notifications
    const postOwnerUserId = await ForumRepository.getRealUserIdFromPost(postId);
    const shortContent = content.length > 50 ? content.substring(0, 50) + "..." : content;
    
    if (postOwnerUserId && postOwnerUserId !== userId) {
      NotificationService.sendToUser(
        postOwnerUserId,
        "New Comment",
        `${profile.display_name} commented: "${shortContent}"`,
        { type: "forum_comment", postId }
      ).catch(console.error);
    }

    if (parentCommentId) {
      const commentOwnerUserId = await ForumRepository.getRealUserIdFromComment(parentCommentId);
      if (commentOwnerUserId && commentOwnerUserId !== userId && commentOwnerUserId !== postOwnerUserId) {
        NotificationService.sendToUser(
          commentOwnerUserId,
          "New Reply",
          `${profile.display_name} replied: "${shortContent}"`,
          { type: "forum_reply", postId }
        ).catch(console.error);
      }
    }

    return comment;
  }

  static async listComments(postId: string, userId: string) {
    return ForumRepository.listComments(postId, userId);
  }

  static async toggleLikePost(userId: string, postId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const added = await ForumRepository.toggleLikePost(userId, postId);
    
    if (added) {
      const ownerId = await ForumRepository.getRealUserIdFromPost(postId);
      if (ownerId && ownerId !== userId) {
        NotificationService.sendToUser(
          ownerId,
          "New Like",
          `${profile.display_name} liked your anonymous post.`,
          { type: "forum_like", postId }
        ).catch(console.error);
      }
    }
    
    return { liked: added };
  }

  static async toggleSavePost(userId: string, postId: string) {
    await this.getOrCreateProfile(userId);
    const added = await ForumRepository.toggleSavePost(userId, postId);
    return { saved: added };
  }

  static async votePoll(userId: string, pollId: string, optionId: string) {
    await this.getOrCreateProfile(userId);
    await ForumRepository.votePoll(userId, pollId, optionId);
  }

  static async reportContent(userId: string, targetType: string, targetId: string, reason: string, details?: string) {
    await this.getOrCreateProfile(userId);
    await ForumRepository.reportContent(userId, targetType, targetId, reason, details);
  }

  static async blockProfile(userId: string, profileId: string) {
    await this.getOrCreateProfile(userId);
    await ForumRepository.blockProfile(userId, profileId);
  }
}
