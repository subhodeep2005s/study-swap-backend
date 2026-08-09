import { query, getClient } from "@/config/db";
import { AppError } from "@/core/errors/AppError";

export class ForumRepository {
  // ---------------------------------------------------------
  // Profiles
  // ---------------------------------------------------------
  static async getProfileByUserId(userId: string) {
    const res = await query(`SELECT * FROM anonymous_profiles WHERE user_id = $1`, [userId]);
    return res.rows[0];
  }

  static async getProfileByDisplayName(displayName: string) {
    const res = await query(`SELECT id FROM anonymous_profiles WHERE display_name = $1`, [displayName]);
    return res.rows[0];
  }

  static async createProfile(userId: string, displayName: string, avatarKey?: string, avatarUrl?: string) {
    const res = await query(
      `INSERT INTO anonymous_profiles (user_id, display_name, avatar_key, avatar_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, displayName, avatarKey || null, avatarUrl || null]
    );
    return res.rows[0];
  }

  static async updateProfile(userId: string, data: { displayName?: string, avatarKey?: string, avatarUrl?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.displayName !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(data.displayName);
    }
    if (data.avatarKey !== undefined) {
      fields.push(`avatar_key = $${paramIndex++}`);
      values.push(data.avatarKey);
    }
    if (data.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatarUrl);
    }

    if (fields.length === 0) return this.getProfileByUserId(userId);

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const res = await query(
      `UPDATE anonymous_profiles SET ${fields.join(", ")} WHERE user_id = $${paramIndex} RETURNING *`,
      values
    );
    return res.rows[0];
  }

  // ---------------------------------------------------------
  // Categories
  // ---------------------------------------------------------
  static async getCategories() {
    const res = await query(`SELECT * FROM anonymous_categories WHERE is_active = true ORDER BY sort_order ASC`);
    return res.rows;
  }

  // ---------------------------------------------------------
  // Posts
  // ---------------------------------------------------------
  static async createPost(
    profileId: string, categoryId: string, type: string, title: string, content: string,
    media?: Array<{ objectKey: string; url: string; mimeType: string; size: number; type: string }>,
    poll?: { expiresInHours?: number; options: string[] }
  ) {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // 1. Create Post
      const postRes = await client.query(
        `INSERT INTO anonymous_posts (anonymous_profile_id, category_id, type, title, content)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [profileId, categoryId, type, title, content]
      );
      const postId = postRes.rows[0].id;

      // 2. Create Media
      if (media && media.length > 0) {
        for (const m of media) {
          await client.query(
            `INSERT INTO anonymous_post_media (post_id, object_key, url, mime_type, size, type)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [postId, m.objectKey, m.url, m.mimeType, m.size, m.type]
          );
        }
      }

      // 3. Create Poll
      if (poll && poll.options.length > 0) {
        let expiresAt = null;
        if (poll.expiresInHours) {
          expiresAt = new Date(Date.now() + poll.expiresInHours * 60 * 60 * 1000);
        }
        
        const pollRes = await client.query(
          `INSERT INTO anonymous_polls (post_id, expires_at) VALUES ($1, $2) RETURNING id`,
          [postId, expiresAt]
        );
        const pollId = pollRes.rows[0].id;

        for (let i = 0; i < poll.options.length; i++) {
          await client.query(
            `INSERT INTO anonymous_poll_options (poll_id, text, sort_order) VALUES ($1, $2, $3)`,
            [pollId, poll.options[i], i]
          );
        }
      }

      await client.query("COMMIT");
      return postId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPostDetails(postId: string, userId: string) {
    // Basic Post info
    const postRes = await query(
      `SELECT p.id, p.title, p.content, p.type, p.status, p.created_at, p.updated_at,
              c.name as category,
              prof.display_name as author_name, prof.avatar_url as author_avatar
       FROM anonymous_posts p
       JOIN anonymous_categories c ON c.id = p.category_id
       JOIN anonymous_profiles prof ON prof.id = p.anonymous_profile_id
       WHERE p.id = $1 AND p.status = 'PUBLISHED'`,
      [postId]
    );
    if (!postRes.rows.length) return null;
    const post: any = postRes.rows[0];

    // Media
    const mediaRes = await query(`SELECT * FROM anonymous_post_media WHERE post_id = $1`, [postId]);
    post.media = mediaRes.rows;

    // Poll
    const pollRes = await query(`SELECT * FROM anonymous_polls WHERE post_id = $1`, [postId]);
    if (pollRes.rows.length > 0) {
      const poll: any = {
        id: pollRes.rows[0]!.id,
        expires_at: pollRes.rows[0]!.expires_at,
        total_votes: 0,
      };
      const optsRes = await query(
        `SELECT o.id, o.text, COUNT(v.id) as vote_count,
           MAX(CASE WHEN v.user_id = $2 THEN 1 ELSE 0 END) as has_voted
         FROM anonymous_poll_options o
         LEFT JOIN anonymous_poll_votes v ON v.option_id = o.id
         WHERE o.poll_id = $1
         GROUP BY o.id ORDER BY o.sort_order ASC`,
        [poll.id, userId]
      );
      
      let totalVotes = 0;
      poll.options = optsRes.rows.map((opt: any) => {
        const voteCount = parseInt(opt.vote_count || "0", 10);
        totalVotes += voteCount;
        return {
          id: opt.id,
          text: opt.text,
          vote_count: voteCount,
          voted: opt.has_voted === 1
        };
      });
      poll.total_votes = totalVotes;
      post.poll = poll;
    } else {
      post.poll = null;
    }

    // Counts & Viewer State
    const countsRes = await query(
      `SELECT 
         (SELECT COUNT(*) FROM anonymous_post_likes WHERE post_id = $1) as likes,
         (SELECT COUNT(*) FROM anonymous_comments WHERE post_id = $1 AND status = 'PUBLISHED') as comments,
         EXISTS(SELECT 1 FROM anonymous_post_likes WHERE post_id = $1 AND user_id = $2) as viewer_liked,
         EXISTS(SELECT 1 FROM anonymous_saved_posts WHERE post_id = $1 AND user_id = $2) as viewer_saved
      `, [postId, userId]
    );
    post.counts = {
      likes: parseInt(countsRes.rows[0]?.likes || "0", 10),
      comments: parseInt(countsRes.rows[0]?.comments || "0", 10)
    };
    post.viewer = {
      liked: countsRes.rows[0]?.viewer_liked || false,
      saved: countsRes.rows[0]?.viewer_saved || false
    };

    return post;
  }

  static async listPosts(userId: string, categoryId?: string, cursor?: string, limit: number = 20, savedOnly: boolean = false, sortBy: string = "new") {
    let sql = `
      SELECT p.id, p.title, p.content, p.type, p.created_at,
             c.name as category,
             prof.display_name as author_name, prof.avatar_url as author_avatar,
             (SELECT COUNT(*) FROM anonymous_post_likes WHERE post_id = p.id) as likes,
             (SELECT COUNT(*) FROM anonymous_comments WHERE post_id = p.id AND status = 'PUBLISHED') as comments,
             EXISTS(SELECT 1 FROM anonymous_post_likes WHERE post_id = p.id AND user_id = $1) as viewer_liked,
             EXISTS(SELECT 1 FROM anonymous_saved_posts WHERE post_id = p.id AND user_id = $1) as viewer_saved
      FROM anonymous_posts p
      JOIN anonymous_categories c ON c.id = p.category_id
      JOIN anonymous_profiles prof ON prof.id = p.anonymous_profile_id
      WHERE p.status = 'PUBLISHED'
      AND NOT EXISTS (
        SELECT 1 FROM anonymous_blocks b WHERE b.user_id = $1 AND b.blocked_anonymous_profile_id = p.anonymous_profile_id
      )
    `;
    const params: any[] = [userId];

    if (savedOnly) {
      sql += ` AND EXISTS (SELECT 1 FROM anonymous_saved_posts WHERE post_id = p.id AND user_id = $1)`;
    }

    if (categoryId) {
      params.push(categoryId);
      sql += ` AND p.category_id = $${params.length}`;
    }

    if (cursor) {
      if (sortBy === "new") {
        params.push(cursor);
        sql += ` AND p.created_at < $${params.length}`; // Simplified cursor for now
      } else {
        const offset = parseInt(cursor, 10);
        if (!isNaN(offset)) {
          // Use offset for non-new sorts
          sql += ` OFFSET ${offset}`; // Note: safe since offset is parsed as int
        }
      }
    }

    params.push(limit);
    
    if (sortBy === "most_liked") {
      sql += ` ORDER BY likes DESC, p.created_at DESC LIMIT $${params.length}`;
    } else if (sortBy === "most_discussed") {
      sql += ` ORDER BY comments DESC, p.created_at DESC LIMIT $${params.length}`;
    } else if (sortBy === "trending") {
      sql += ` ORDER BY (
        (SELECT COUNT(*) FROM anonymous_post_likes WHERE post_id = p.id) * 2 + 
        (SELECT COUNT(*) FROM anonymous_comments WHERE post_id = p.id AND status = 'PUBLISHED')
      ) DESC, p.created_at DESC LIMIT $${params.length}`;
    } else {
      sql += ` ORDER BY p.created_at DESC LIMIT $${params.length}`;
    }

    const res = await query(sql, params);
    const posts = res.rows;
    if (posts.length === 0) return [];

    const postIds = posts.map((p: any) => p.id);

    // Fetch media
    const mediaRes = await query(`SELECT * FROM anonymous_post_media WHERE post_id = ANY($1)`, [postIds]);
    const mediaByPostId: Record<string, any[]> = {};
    for (const m of mediaRes.rows) {
      if (!mediaByPostId[m.post_id]) mediaByPostId[m.post_id] = [];
      mediaByPostId[m.post_id]!.push(m);
    }

    // Fetch polls
    const pollRes = await query(`SELECT * FROM anonymous_polls WHERE post_id = ANY($1)`, [postIds]);
    
    if (pollRes.rows.length > 0) {
      const pollIds = pollRes.rows.map((pl: any) => pl.id);
      const optsRes = await query(
        `SELECT o.id, o.poll_id, o.text, o.sort_order, COUNT(v.id) as vote_count,
           MAX(CASE WHEN v.user_id = $2 THEN 1 ELSE 0 END) as has_voted
         FROM anonymous_poll_options o
         LEFT JOIN anonymous_poll_votes v ON v.option_id = o.id
         WHERE o.poll_id = ANY($1)
         GROUP BY o.id, o.poll_id, o.text, o.sort_order
         ORDER BY o.sort_order ASC`,
        [pollIds, userId]
      );
      
      const optsByPollId: Record<string, any[]> = {};
      for (const opt of optsRes.rows) {
        if (!optsByPollId[opt.poll_id]) optsByPollId[opt.poll_id] = [];
        optsByPollId[opt.poll_id]!.push({
          id: opt.id,
          text: opt.text,
          vote_count: parseInt(opt.vote_count || "0", 10),
          voted: opt.has_voted === 1
        });
      }

      const pollByPostId: Record<string, any> = {};
      for (const pl of pollRes.rows) {
        const options = optsByPollId[pl.id] || [];
        pollByPostId[pl.post_id] = {
          id: pl.id,
          expires_at: pl.expires_at,
          total_votes: options.reduce((sum: number, o: any) => sum + o.vote_count, 0),
          options: options
        };
      }
      
      for (const p of posts) {
        p.poll = pollByPostId[p.id] || null;
      }
    } else {
      for (const p of posts) {
        p.poll = null;
      }
    }

    // Attach to posts and cast types
    for (const p of posts) {
      p.media = mediaByPostId[p.id] || [];
      p.likes = parseInt(p.likes || "0", 10);
      p.comments = parseInt(p.comments || "0", 10);
      p.viewer_liked = !!p.viewer_liked;
      p.viewer_saved = !!p.viewer_saved;
    }
    
    return posts;
  }

  // ---------------------------------------------------------
  // Comments
  // ---------------------------------------------------------
  static async createComment(postId: string, profileId: string, content: string, parentCommentId?: string) {
    const res = await query(
      `INSERT INTO anonymous_comments (post_id, anonymous_profile_id, content, parent_comment_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [postId, profileId, content, parentCommentId || null]
    );
    return res.rows[0];
  }

  static async listComments(postId: string, userId: string) {
    // Only top level comments for now, replies nested via client or separate logic
    // We will return all published comments for a post, client can build tree
    const res = await query(
      `SELECT c.id, c.parent_comment_id, c.content, c.created_at,
              prof.display_name as author_name, prof.avatar_url as author_avatar,
              (SELECT COUNT(*) FROM anonymous_comment_likes WHERE comment_id = c.id) as likes,
              EXISTS(SELECT 1 FROM anonymous_comment_likes WHERE comment_id = c.id AND user_id = $2) as viewer_liked
       FROM anonymous_comments c
       JOIN anonymous_profiles prof ON prof.id = c.anonymous_profile_id
       WHERE c.post_id = $1 AND c.status = 'PUBLISHED'
       AND NOT EXISTS (
         SELECT 1 FROM anonymous_blocks b WHERE b.user_id = $2 AND b.blocked_anonymous_profile_id = c.anonymous_profile_id
       )
       ORDER BY c.created_at ASC`,
      [postId, userId]
    );
    return res.rows;
  }

  // ---------------------------------------------------------
  // Reactions & Actions
  // ---------------------------------------------------------
  static async toggleLikePost(userId: string, postId: string) {
    const check = await query(`SELECT 1 FROM anonymous_post_likes WHERE user_id = $1 AND post_id = $2`, [userId, postId]);
    if (check.rows.length > 0) {
      await query(`DELETE FROM anonymous_post_likes WHERE user_id = $1 AND post_id = $2`, [userId, postId]);
      return false;
    } else {
      await query(`INSERT INTO anonymous_post_likes (user_id, post_id) VALUES ($1, $2)`, [userId, postId]);
      return true;
    }
  }


  static async toggleSavePost(userId: string, postId: string) {
    const check = await query(`SELECT 1 FROM anonymous_saved_posts WHERE user_id = $1 AND post_id = $2`, [userId, postId]);
    if (check.rows.length > 0) {
      await query(`DELETE FROM anonymous_saved_posts WHERE user_id = $1 AND post_id = $2`, [userId, postId]);
      return false;
    } else {
      await query(`INSERT INTO anonymous_saved_posts (user_id, post_id) VALUES ($1, $2)`, [userId, postId]);
      return true;
    }
  }

  static async votePoll(userId: string, pollId: string, optionId: string) {
    // Postgres UPSERT equivalent
    await query(
      `INSERT INTO anonymous_poll_votes (user_id, poll_id, option_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, poll_id) DO UPDATE SET option_id = EXCLUDED.option_id, created_at = NOW()`,
      [userId, pollId, optionId]
    );
  }

  static async reportContent(userId: string, targetType: string, targetId: string, reason: string, details?: string) {
    await query(
      `INSERT INTO anonymous_reports (user_id, target_type, target_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, target_type, target_id) DO NOTHING`,
      [userId, targetType, targetId, reason, details || null]
    );
  }

  static async blockProfile(userId: string, blockedProfileId: string) {
    await query(
      `INSERT INTO anonymous_blocks (user_id, blocked_anonymous_profile_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, blockedProfileId]
    );
  }

  // ---------------------------------------------------------
  // Helper for Notifications
  // ---------------------------------------------------------
  static async getRealUserIdFromPost(postId: string): Promise<string | null> {
    const res = await query(
      `SELECT prof.user_id 
       FROM anonymous_posts p
       JOIN anonymous_profiles prof ON prof.id = p.anonymous_profile_id
       WHERE p.id = $1`, [postId]
    );
    return res.rows[0]?.user_id || null;
  }

  static async getRealUserIdFromComment(commentId: string): Promise<string | null> {
    const res = await query(
      `SELECT prof.user_id 
       FROM anonymous_comments c
       JOIN anonymous_profiles prof ON prof.id = c.anonymous_profile_id
       WHERE c.id = $1`, [commentId]
    );
    return res.rows[0]?.user_id || null;
  }
}
