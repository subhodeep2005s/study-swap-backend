import { redis } from "@/config/redis";
import { AppError } from "@/core/errors/AppError";
import { StoriesRepository } from "./stories.repository";

export async function uploadStory(userId: string, imageUrl: string) {
  // Store the story in Redis with a TTL of 24 hours (86400 seconds)
  const key = `story:${userId}`;
  await redis.set(key, imageUrl, "EX", 86400);
}

export async function getStories(userIds: string[]): Promise<Record<string, string | null>> {
  if (userIds.length === 0) return {};

  const keys = userIds.map(id => `story:${id}`);
  // mget fetches multiple keys at once. It returns an array of values where missing keys return null
  const values = await redis.mget(...keys);

  const storiesMap: Record<string, string | null> = {};
  for (let i = 0; i < userIds.length; i++) {
    const id = userIds[i]!;
    const val = values[i];
    storiesMap[id] = val ? val : null;
  }

  return storiesMap;
}

export async function deleteStory(userId: string) {
  const storyKey = `story:${userId}`;
  const viewsKey = `story_views:${userId}`;
  
  await redis.del(storyKey, viewsKey);
}

export async function recordView(viewerId: string, ownerId: string) {
  const storyKey = `story:${ownerId}`;
  const viewsKey = `story_views:${ownerId}`;

  const storyTtl = await redis.ttl(storyKey);
  
  if (storyTtl < 0) {
    throw new AppError("Story not found or expired", 404);
  }

  // Add the viewer to the set
  await redis.sadd(viewsKey, viewerId);
  // Keep the views TTL strictly synced to the story's remaining TTL
  await redis.expire(viewsKey, storyTtl);
}

export async function getStoryViews(ownerId: string) {
  const viewsKey = `story_views:${ownerId}`;
  const viewerIds = await redis.smembers(viewsKey);

  return await StoriesRepository.getStoryViews(viewerIds);
}
