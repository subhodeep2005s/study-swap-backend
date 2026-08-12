import { query, getClient } from "@/config/db";
import type { 
  AdminHallOfFameFilters, 
  PublicHallOfFameFilters,
  HallOfFame
} from "./hall-of-fame.types";
import type {
  CreateHallOfFameInput,
  UpdateHallOfFameInput,
  CreateCommentInput,
  UpdateCommentInput,
} from "./hall-of-fame.schema";

export class HallOfFameRepository {

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================
  static async createStory(adminId: string, data: CreateHallOfFameInput): Promise<any> {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const sql = `
        INSERT INTO hall_of_fame (
          title, short_description, story, person_name, person_role,
          achievement_type, achievement_year, result_label, result_before, result_after,
          country_id, media_type, media_key, thumbnail_key, status, is_featured, admin_id,
          published_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *;
      `;
      
      const publishedAt = data.status === 'PUBLISHED' ? new Date() : null;
      
      const values = [
        data.title, data.short_description || null, data.story, data.person_name, data.person_role || null,
        data.achievement_type, data.achievement_year, data.result_label || null, data.result_before || null, data.result_after || null,
        data.country_id, data.media_type || 'NONE', data.media_key || null, data.thumbnail_key || null, data.status || 'DRAFT', data.is_featured || false, adminId,
        publishedAt
      ];
      
      const res = await client.query(sql, values);
      const story = res.rows[0];
      
      if (data.education_node_ids && data.education_node_ids.length > 0) {
        for (const nodeId of data.education_node_ids) {
          await client.query(
            "INSERT INTO hall_of_fame_education_nodes (hall_of_fame_id, education_node_id) VALUES ($1, $2)",
            [story.id, nodeId]
          );
        }
      }
      
      await client.query("COMMIT");
      return story;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateStory(id: string, data: UpdateHallOfFameInput, updatePublishedAt: boolean = false): Promise<any> {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      const addField = (col: string, val: any) => {
        if (val !== undefined) {
          fields.push(`${col} = $${idx++}`);
          values.push(val);
        }
      };

      addField('title', data.title);
      addField('short_description', data.short_description);
      addField('story', data.story);
      addField('person_name', data.person_name);
      addField('person_role', data.person_role);
      addField('achievement_type', data.achievement_type);
      addField('achievement_year', data.achievement_year);
      addField('result_label', data.result_label);
      addField('result_before', data.result_before);
      addField('result_after', data.result_after);
      addField('country_id', data.country_id);
      addField('media_type', data.media_type);
      addField('media_key', data.media_key);
      addField('thumbnail_key', data.thumbnail_key);
      addField('status', data.status);
      addField('is_featured', data.is_featured);
      
      if (updatePublishedAt) {
        fields.push(`published_at = $${idx++}`);
        values.push(new Date());
      } else if (data.status === 'DRAFT' || data.status === 'ARCHIVED') {
        fields.push(`published_at = NULL`);
      }

      fields.push(`updated_at = NOW()`);

      if (fields.length > 1) { // >1 because updated_at is always there
        const sql = `UPDATE hall_of_fame SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
        values.push(id);
        const res = await client.query(sql, values);
        if (res.rowCount === 0) {
          await client.query("ROLLBACK");
          return null;
        }
      }

      if (data.education_node_ids) {
        await client.query("DELETE FROM hall_of_fame_education_nodes WHERE hall_of_fame_id = $1", [id]);
        for (const nodeId of data.education_node_ids) {
          await client.query(
            "INSERT INTO hall_of_fame_education_nodes (hall_of_fame_id, education_node_id) VALUES ($1, $2)",
            [id, nodeId]
          );
        }
      }

      await client.query("COMMIT");
      return await this.getStoryById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteStory(id: string, adminId: string): Promise<boolean> {
    const res = await query(
      "UPDATE hall_of_fame SET deleted_at = NOW(), deleted_by = $1, status = 'ARCHIVED' WHERE id = $2 AND deleted_at IS NULL RETURNING id",
      [adminId, id]
    );
    return (res?.rowCount ?? 0) > 0;
  }

  static async restoreStory(id: string): Promise<boolean> {
    const res = await query(
      "UPDATE hall_of_fame SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id",
      [id]
    );
    return (res?.rowCount ?? 0) > 0;
  }

  static async setFeatured(id: string, isFeatured: boolean): Promise<boolean> {
    const res = await query(
      "UPDATE hall_of_fame SET is_featured = $1 WHERE id = $2 RETURNING id",
      [isFeatured, id]
    );
    return (res?.rowCount ?? 0) > 0;
  }

  static async getAdminStories(filters: AdminHallOfFameFilters): Promise<{ data: any[], total: number }> {
    let sql = `SELECT * FROM hall_of_fame WHERE 1=1`;
    const countSqlBase = `SELECT COUNT(*) FROM hall_of_fame WHERE 1=1`;
    const values: any[] = [];
    let idx = 1;
    let whereClause = "";

    if (filters.search) {
      whereClause += ` AND (title ILIKE $${idx} OR person_name ILIKE $${idx} OR short_description ILIKE $${idx})`;
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.status) {
      whereClause += ` AND status = $${idx++}`;
      values.push(filters.status);
    }

    if (filters.country_id) {
      whereClause += ` AND country_id = $${idx++}`;
      values.push(filters.country_id);
    }

    if (filters.achievement_year) {
      whereClause += ` AND achievement_year = $${idx++}`;
      values.push(filters.achievement_year);
    }

    if (filters.achievement_type) {
      whereClause += ` AND achievement_type = $${idx++}`;
      values.push(filters.achievement_type);
    }

    if (filters.is_featured !== undefined) {
      whereClause += ` AND is_featured = $${idx++}`;
      values.push(filters.is_featured);
    }

    if (filters.media_type) {
      whereClause += ` AND media_type = $${idx++}`;
      values.push(filters.media_type);
    }

    if (filters.education_node_id) {
      whereClause += ` AND id IN (SELECT hall_of_fame_id FROM hall_of_fame_education_nodes WHERE education_node_id = $${idx++})`;
      values.push(filters.education_node_id);
    }

    const countRes = await query(countSqlBase + whereClause, values);
    const total = parseInt(countRes?.rows[0]?.count || '0', 10);

    const sortMap: Record<string, string> = {
      'latest': 'created_at DESC',
      'oldest': 'created_at ASC',
      'most_viewed': 'views_count DESC',
      'most_liked': 'likes_count DESC',
      'most_helpful': 'helpful_count DESC',
      'most_saved': 'saves_count DESC',
    };
    const orderBy = sortMap[filters.sort || 'latest'] || 'created_at DESC';

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    sql += whereClause + ` ORDER BY ${orderBy} LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limit, offset);

    const res = await query(sql, values);
    return { data: res.rows, total };
  }

  // ============================================================================
  // PUBLIC OPERATIONS
  // ============================================================================

  static async getPublicStories(filters: PublicHallOfFameFilters): Promise<{ data: any[], nextCursor: string | null }> {
    let sql = `SELECT * FROM hall_of_fame WHERE deleted_at IS NULL AND status = 'PUBLISHED'`;
    const values: any[] = [];
    let idx = 1;

    if (filters.search) {
      sql += ` AND (title ILIKE $${idx} OR person_name ILIKE $${idx} OR short_description ILIKE $${idx})`;
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.country_id) {
      sql += ` AND country_id = $${idx++}`;
      values.push(filters.country_id);
    }

    if (filters.achievement_year) {
      sql += ` AND achievement_year = $${idx++}`;
      values.push(filters.achievement_year);
    }

    if (filters.achievement_type) {
      sql += ` AND achievement_type = $${idx++}`;
      values.push(filters.achievement_type);
    }

    if (filters.education_node_id) {
      sql += ` AND id IN (SELECT hall_of_fame_id FROM hall_of_fame_education_nodes WHERE education_node_id = $${idx++})`;
      values.push(filters.education_node_id);
    }

    // Cursor pagination (assuming default sort by latest published_at)
    const limit = (filters.limit || 20) + 1; // +1 to check if there is a next page
    
    const sort = filters.sort || 'latest';
    if (sort === 'latest') {
      if (filters.cursor) {
        sql += ` AND published_at < $${idx++}`;
        values.push(new Date(filters.cursor));
      }
      sql += ` ORDER BY published_at DESC LIMIT $${idx++}`;
      values.push(limit);
    } else {
      // Offset pagination fallback for complex sorts like trending
      const sortMap: Record<string, string> = {
        'oldest': 'published_at ASC',
        'trending': '(helpful_count * 2 + likes_count * 1.5 + views_count * 1 + saves_count * 2) DESC, published_at DESC',
        'most_liked': 'likes_count DESC, published_at DESC',
        'most_helpful': 'helpful_count DESC, published_at DESC',
        'most_saved': 'saves_count DESC, published_at DESC',
      };
      const orderBy = sortMap[sort] || 'published_at DESC';
      
      const page = filters.page || 1;
      const offset = (page - 1) * (filters.limit || 20);
      sql += ` ORDER BY ${orderBy} LIMIT $${idx++} OFFSET $${idx++}`;
      values.push(filters.limit || 20, offset);
      
      const res = await query(sql, values);
      return { data: res.rows, nextCursor: null }; // Cursor unsupported for non-latest sorts
    }

    const res = await query(sql, values);
    const rows = res.rows;
    let nextCursor = null;

    if (rows.length === limit) {
      nextCursor = rows[rows.length - 2]?.published_at?.toISOString() || null;
      rows.pop(); // remove the extra one
    }

    return { data: rows, nextCursor };
  }

  static async getStoryById(id: string): Promise<any> {
    const res = await query("SELECT * FROM hall_of_fame WHERE id = $1", [id]);
    if (!res || res.rowCount === 0) return null;
    const story = res.rows[0];
    if (!story) return null;

    const nodesRes = await query(`
      SELECT en.id, en.name, en.node_type 
      FROM education_nodes en
      JOIN hall_of_fame_education_nodes hen ON en.id = hen.education_node_id
      WHERE hen.hall_of_fame_id = $1
    `, [id]);
    story.education_nodes = nodesRes?.rows || [];

    const countryRes = await query("SELECT id, name FROM countries WHERE id = $1", [story.country_id]);
    story.country = countryRes?.rows[0] || null;

    return story;
  }

  static async getFeaturedStories(): Promise<any[]> {
    const res = await query(
      "SELECT * FROM hall_of_fame WHERE deleted_at IS NULL AND status = 'PUBLISHED' AND is_featured = true ORDER BY published_at DESC LIMIT 10"
    );
    return res.rows;
  }

  static async getFilters(): Promise<any> {
    const yearsRes = await query("SELECT DISTINCT achievement_year FROM hall_of_fame WHERE deleted_at IS NULL AND status = 'PUBLISHED' ORDER BY achievement_year DESC");
    const achievementTypesRes = await query("SELECT DISTINCT achievement_type FROM hall_of_fame WHERE deleted_at IS NULL AND status = 'PUBLISHED'");
    const countriesRes = await query(`
      SELECT DISTINCT c.id, c.name 
      FROM countries c
      JOIN hall_of_fame h ON h.country_id = c.id
      WHERE h.deleted_at IS NULL AND h.status = 'PUBLISHED'
    `);
    
    return {
      years: yearsRes.rows.map(r => r.achievement_year),
      achievement_types: achievementTypesRes.rows.map(r => r.achievement_type),
      countries: countriesRes.rows,
    };
  }

  static async getRecommendedStories(userId: string, limit: number = 20): Promise<any[]> {
    const userNodesRes = await query("SELECT node_id FROM user_education_nodes WHERE user_id = $1", [userId]);
    const nodeIds = userNodesRes.rows.map(r => r.node_id);

    const userRes = await query(`
      SELECT p.country_id 
      FROM profiles p 
      WHERE p.user_id = $1
    `, [userId]);
    const countryId = userRes.rows[0]?.country_id;

    let sql = `
      SELECT h.*, 
        (
          (SELECT count(*) FROM hall_of_fame_education_nodes hen WHERE hen.hall_of_fame_id = h.id AND hen.education_node_id = ANY($1::uuid[])) * 10 +
          (CASE WHEN h.country_id = $2 THEN 5 ELSE 0 END) +
          (CASE WHEN h.is_featured THEN 3 ELSE 0 END) +
          ((h.helpful_count * 2 + h.likes_count * 1.5 + h.views_count * 1) / 100)
        ) as relevance_score
      FROM hall_of_fame h
      WHERE h.deleted_at IS NULL AND h.status = 'PUBLISHED'
      ORDER BY relevance_score DESC, h.published_at DESC
      LIMIT $3
    `;
    const res = await query(sql, [nodeIds.length ? nodeIds : [null], countryId || null, limit]);
    return res.rows;
  }

  // ============================================================================
  // INTERACTIONS
  // ============================================================================

  static async recordView(storyId: string, userId: string): Promise<boolean> {
    try {
      const res = await query(
        "INSERT INTO hall_of_fame_views (hall_of_fame_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [storyId, userId]
      );
      if ((res?.rowCount ?? 0) > 0) {
        await query("UPDATE hall_of_fame SET views_count = views_count + 1 WHERE id = $1", [storyId]);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  static async likeStory(storyId: string, userId: string): Promise<boolean> {
    const res = await query(
      "INSERT INTO hall_of_fame_likes (hall_of_fame_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [storyId, userId]
    );
    if ((res?.rowCount ?? 0) > 0) {
      await query("UPDATE hall_of_fame SET likes_count = likes_count + 1 WHERE id = $1", [storyId]);
      return true;
    }
    return false;
  }

  static async unlikeStory(storyId: string, userId: string): Promise<boolean> {
    const res = await query(
      "DELETE FROM hall_of_fame_likes WHERE hall_of_fame_id = $1 AND user_id = $2",
      [storyId, userId]
    );
    if ((res?.rowCount ?? 0) > 0) {
      await query("UPDATE hall_of_fame SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1", [storyId]);
      return true;
    }
    return false;
  }

  static async markHelpful(storyId: string, userId: string): Promise<boolean> {
    const res = await query(
      "INSERT INTO hall_of_fame_helpful (hall_of_fame_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [storyId, userId]
    );
    if ((res?.rowCount ?? 0) > 0) {
      await query("UPDATE hall_of_fame SET helpful_count = helpful_count + 1 WHERE id = $1", [storyId]);
      return true;
    }
    return false;
  }

  static async unmarkHelpful(storyId: string, userId: string): Promise<boolean> {
    const res = await query(
      "DELETE FROM hall_of_fame_helpful WHERE hall_of_fame_id = $1 AND user_id = $2",
      [storyId, userId]
    );
    if ((res?.rowCount ?? 0) > 0) {
      await query("UPDATE hall_of_fame SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = $1", [storyId]);
      return true;
    }
    return false;
  }

  static async saveStory(storyId: string, userId: string): Promise<boolean> {
    const res = await query(
      "INSERT INTO hall_of_fame_saves (hall_of_fame_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [storyId, userId]
    );
    if ((res?.rowCount ?? 0) > 0) {
      await query("UPDATE hall_of_fame SET saves_count = saves_count + 1 WHERE id = $1", [storyId]);
      return true;
    }
    return false;
  }

  static async unsaveStory(storyId: string, userId: string): Promise<boolean> {
    const res = await query(
      "DELETE FROM hall_of_fame_saves WHERE hall_of_fame_id = $1 AND user_id = $2",
      [storyId, userId]
    );
    if ((res?.rowCount ?? 0) > 0) {
      await query("UPDATE hall_of_fame SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = $1", [storyId]);
      return true;
    }
    return false;
  }

  static async getUserInteractions(storyId: string, userId: string) {
    const liked = await query("SELECT 1 FROM hall_of_fame_likes WHERE hall_of_fame_id = $1 AND user_id = $2", [storyId, userId]);
    const helpful = await query("SELECT 1 FROM hall_of_fame_helpful WHERE hall_of_fame_id = $1 AND user_id = $2", [storyId, userId]);
    const saved = await query("SELECT 1 FROM hall_of_fame_saves WHERE hall_of_fame_id = $1 AND user_id = $2", [storyId, userId]);
    
    return {
      liked: (liked?.rowCount ?? 0) > 0,
      helpful: (helpful?.rowCount ?? 0) > 0,
      saved: (saved?.rowCount ?? 0) > 0,
    };
  }

  static async getSavedStories(userId: string, limit: number, offset: number) {
    const sql = `
      SELECT h.* 
      FROM hall_of_fame h
      JOIN hall_of_fame_saves s ON s.hall_of_fame_id = h.id
      WHERE s.user_id = $1 AND h.deleted_at IS NULL AND h.status = 'PUBLISHED'
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(sql, [userId, limit, offset]);
    return res.rows;
  }

  // ============================================================================
  // COMMENTS
  // ============================================================================

  static async getComments(storyId: string, limit: number, offset: number): Promise<any[]> {
    const sql = `
      SELECT c.*, p.full_name as user_name, p.profile_image as user_avatar, u.role as user_role
      FROM hall_of_fame_comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE c.hall_of_fame_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(sql, [storyId, limit, offset]);
    return res.rows;
  }

  static async getCommentById(commentId: string): Promise<any> {
    const res = await query("SELECT * FROM hall_of_fame_comments WHERE id = $1 AND deleted_at IS NULL", [commentId]);
    return res.rows[0] || null;
  }

  static async createComment(storyId: string, userId: string, data: CreateCommentInput): Promise<any> {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const sql = `
        INSERT INTO hall_of_fame_comments (hall_of_fame_id, user_id, parent_comment_id, content)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const res = await client.query(sql, [storyId, userId, data.parent_comment_id || null, data.content]);
      
      await client.query("UPDATE hall_of_fame SET comments_count = comments_count + 1 WHERE id = $1", [storyId]);
      
      await client.query("COMMIT");
      return res.rows[0];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  static async updateComment(commentId: string, content: string): Promise<any> {
    const res = await query(
      "UPDATE hall_of_fame_comments SET content = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING *",
      [content, commentId]
    );
    return res.rows[0];
  }

  static async deleteComment(commentId: string, storyId: string, userId: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const res = await client.query(
        "UPDATE hall_of_fame_comments SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id",
        [userId, commentId]
      );
      
      if (res.rowCount && res.rowCount > 0) {
        await client.query("UPDATE hall_of_fame SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1", [storyId]);
      }
      
      await client.query("COMMIT");
      return (res.rowCount ?? 0) > 0;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // ADMIN STATS
  // ============================================================================

  static async getAdminStats() {
    const total = await query("SELECT COUNT(*) FROM hall_of_fame WHERE deleted_at IS NULL");
    const published = await query("SELECT COUNT(*) FROM hall_of_fame WHERE status = 'PUBLISHED' AND deleted_at IS NULL");
    const drafts = await query("SELECT COUNT(*) FROM hall_of_fame WHERE status = 'DRAFT' AND deleted_at IS NULL");
    const featured = await query("SELECT COUNT(*) FROM hall_of_fame WHERE is_featured = true AND deleted_at IS NULL AND status = 'PUBLISHED'");
    
    const sums = await query(`
      SELECT 
        SUM(views_count) as views,
        SUM(likes_count) as likes,
        SUM(helpful_count) as helpful,
        SUM(saves_count) as saves,
        SUM(comments_count) as comments
      FROM hall_of_fame WHERE deleted_at IS NULL
    `);

    return {
      total_stories: parseInt(total?.rows[0]?.count || '0', 10),
      published_stories: parseInt(published?.rows[0]?.count || '0', 10),
      drafts: parseInt(drafts?.rows[0]?.count || '0', 10),
      featured: parseInt(featured?.rows[0]?.count || '0', 10),
      total_views: parseInt(sums?.rows[0]?.views || '0', 10),
      total_likes: parseInt(sums?.rows[0]?.likes || '0', 10),
      total_helpful: parseInt(sums?.rows[0]?.helpful || '0', 10),
      total_saves: parseInt(sums?.rows[0]?.saves || '0', 10),
      total_comments: parseInt(sums?.rows[0]?.comments || '0', 10),
    };
  }
}
