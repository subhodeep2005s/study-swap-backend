import { query } from "@/config/db";

export class StoriesRepository {
  static async getStoryViews(viewerIds: string[]) {
    if (viewerIds.length === 0) return [];
    const result = await query(
      `SELECT user_id AS "userId", full_name AS "fullName", profile_image AS "profileImage" 
       FROM profiles 
       WHERE user_id = ANY($1)`,
      [viewerIds]
    );
    return result.rows;
  }
}
