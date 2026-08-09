import { query, getClient } from "@/config/db";
import { cursorPayloadSchema } from "./notes.schema";
import type { UploadNoteBody } from "./notes.schema";

export class NotesRepository {
  
  /**
   * Check if an exact duplicate note exists based on the file hash.
   */
  static async checkDuplicateHash(fileHash: string): Promise<string | null> {
    const res = await query("SELECT id FROM notes WHERE file_hash = $1 AND deleted_at IS NULL", [fileHash]);
    if ((res?.rowCount ?? 0) > 0) {
      return res.rows[0]!.id;
    }
    return null;
  }

  /**
   * Creates a new note.
   */
  static async createNote(uploaderId: string, uploaderRole: string, data: UploadNoteBody): Promise<any> {
    const sql = `
      INSERT INTO notes (
        title, description, note_type,
        country_id, education_node_id, category_id, subcategory_id,
        exam_id, board_id, class_id, course_id, subject_id,
        uploader_id, uploader_role,
        file_key, mime_type, file_size, page_count, file_hash
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14,
        $15, $16, $17, $18, $19
      ) RETURNING *;
    `;

    const values = [
      data.title || null,
      data.description || null,
      data.noteType,
      data.countryId || null,
      data.educationNodeId || null,
      data.categoryId || null,
      data.subcategoryId || null,
      data.examId || null,
      data.boardId || null,
      data.classId || null,
      data.courseId || null,
      data.subjectId || null,
      uploaderId,
      uploaderRole,
      data.fileKey,
      data.mimeType,
      data.fileSize,
      data.pageCount || null,
      data.fileHash
    ];

    const res = await query(sql, values);
    return res.rows[0];
  }

  static async getNoteById(noteId: string): Promise<any> {
    const res = await query("SELECT * FROM notes WHERE id = $1 AND deleted_at IS NULL", [noteId]);
    if (res.rowCount === 0) return null;
    return res.rows[0];
  }

  static async getNotesWithCursor(filters: any, cursor?: string, limit: number = 20): Promise<{ items: any[], nextCursor: string | null }> {
    let baseQuery = `SELECT * FROM notes WHERE deleted_at IS NULL`;
    const values: any[] = [];
    let paramIndex = 1;
    
    // Applying filters
    if (filters.q) {
      baseQuery += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      values.push(`%${filters.q}%`);
      paramIndex++;
    }
    const filterKeys = [
      'countryId', 'educationNodeId', 'categoryId', 'subcategoryId',
      'examId', 'boardId', 'classId', 'courseId', 'subjectId', 'noteType', 'uploaderRole'
    ];
    
    for (const key of filterKeys) {
      if (filters[key]) {
        // map camelCase to snake_case
        const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        baseQuery += ` AND ${dbCol} = $${paramIndex}`;
        values.push(filters[key]);
        paramIndex++;
      }
    }

    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        const validated = cursorPayloadSchema.parse(decoded);
        baseQuery += ` AND (created_at < $${paramIndex} OR (created_at = $${paramIndex} AND id < $${paramIndex + 1}))`;
        values.push(validated.createdAt, validated.id);
        paramIndex += 2;
      } catch (error) {
        // invalid cursor, ignore
      }
    }

    // Default sorting based on filters.sort
    let orderBy = `ORDER BY created_at DESC, id DESC`;
    if (filters.sort === 'most_viewed') {
      orderBy = `ORDER BY views_count DESC, created_at DESC, id DESC`;
    } else if (filters.sort === 'most_downloaded') {
      orderBy = `ORDER BY downloads_count DESC, created_at DESC, id DESC`;
    } else if (filters.sort === 'highest_rated') {
      orderBy = `ORDER BY average_rating DESC, created_at DESC, id DESC`;
    }

    baseQuery += ` ${orderBy} LIMIT $${paramIndex}`;
    values.push(limit + 1); // fetch one extra to check if there is a next page

    const res = await query(baseQuery, values);
    const items = res.rows;
    const hasMore = items.length > limit;
    
    if (hasMore) {
      items.pop(); // remove the extra item
    }

    let nextCursor = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1]!;
      const payload = {
        createdAt: lastItem.created_at.toISOString(),
        id: lastItem.id
      };
      nextCursor = Buffer.from(JSON.stringify(payload)).toString('base64');
    }

    return { items, nextCursor };
  }
  
  static async getMyNotes(uploaderId: string, filterState: string, cursor?: string, limit: number = 20) {
    let baseQuery = `SELECT * FROM notes WHERE uploader_id = $1`;
    const values: any[] = [uploaderId];
    let paramIndex = 2;

    if (filterState === 'published') {
      baseQuery += ` AND status = 'PUBLISHED' AND deleted_at IS NULL`;
    } else if (filterState === 'deleted') {
      baseQuery += ` AND deleted_at IS NOT NULL`;
    }

    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        const validated = cursorPayloadSchema.parse(decoded);
        baseQuery += ` AND (created_at < $${paramIndex} OR (created_at = $${paramIndex} AND id < $${paramIndex + 1}))`;
        values.push(validated.createdAt, validated.id);
        paramIndex += 2;
      } catch (error) {
        // invalid cursor, ignore
      }
    }

    baseQuery += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`;
    values.push(limit + 1);

    const res = await query(baseQuery, values);
    const items = res.rows;
    const hasMore = items.length > limit;
    
    if (hasMore) {
      items.pop();
    }

    let nextCursor = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1]!;
      const payload = {
        createdAt: lastItem.created_at.toISOString(),
        id: lastItem.id
      };
      nextCursor = Buffer.from(JSON.stringify(payload)).toString('base64');
    }

    return { items, nextCursor };
  }

  static async softDeleteNote(noteId: string, deletedBy: string): Promise<boolean> {
    const res = await query(
      "UPDATE notes SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id",
      [deletedBy, noteId]
    );
    return res.rowCount !== null && res.rowCount > 0;
  }

  static async restoreNote(noteId: string): Promise<boolean> {
    const res = await query(
      "UPDATE notes SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id",
      [noteId]
    );
    return res.rowCount !== null && res.rowCount > 0;
  }

  static async saveNote(userId: string, noteId: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const checkRes = await client.query("SELECT 1 FROM note_saves WHERE user_id = $1 AND note_id = $2", [userId, noteId]);
      if (checkRes.rowCount! > 0) {
        await client.query("ROLLBACK");
        return false; // Already saved
      }

      await client.query("INSERT INTO note_saves (user_id, note_id) VALUES ($1, $2)", [userId, noteId]);
      await client.query("UPDATE notes SET saves_count = saves_count + 1 WHERE id = $1", [noteId]);
      
      await client.query("COMMIT");
      return true;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  static async unsaveNote(userId: string, noteId: string): Promise<boolean> {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const res = await client.query("DELETE FROM note_saves WHERE user_id = $1 AND note_id = $2 RETURNING id", [userId, noteId]);
      if (res.rowCount === 0) {
        await client.query("ROLLBACK");
        return false; // Not saved
      }

      await client.query("UPDATE notes SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = $1", [noteId]);
      
      await client.query("COMMIT");
      return true;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  static async getSavedNotes(userId: string) {
    const res = await query(
      `SELECT n.* FROM notes n 
       JOIN note_saves s ON n.id = s.note_id 
       WHERE s.user_id = $1 AND n.deleted_at IS NULL 
       ORDER BY s.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async rateNote(userId: string, noteId: string, ratingValue: number): Promise<any> {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Upsert rating
      const upsertSql = `
        INSERT INTO note_ratings (user_id, note_id, rating)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, note_id) 
        DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()
        RETURNING rating, (xmax = 0) AS is_insert
      `;
      const result = await client.query(upsertSql, [userId, noteId, ratingValue]);
      
      // Calculate new average
      const avgSql = `
        SELECT ROUND(AVG(rating), 2) as average_rating, COUNT(*) as count 
        FROM note_ratings WHERE note_id = $1
      `;
      const avgResult = await client.query(avgSql, [noteId]);
      const newAverage = avgResult.rows[0]!.average_rating;
      const newCount = avgResult.rows[0]!.count;

      // Update notes table
      await client.query(
        "UPDATE notes SET average_rating = $1, rating_count = $2 WHERE id = $3",
        [newAverage, newCount, noteId]
      );

      await client.query("COMMIT");
      return { average_rating: newAverage, rating_count: newCount, my_rating: ratingValue };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  
  static async removeRating(userId: string, noteId: string): Promise<any> {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const del = await client.query("DELETE FROM note_ratings WHERE user_id = $1 AND note_id = $2 RETURNING id", [userId, noteId]);
      if (del.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      
      const avgSql = `
        SELECT COALESCE(ROUND(AVG(rating), 2), 0) as average_rating, COUNT(*) as count 
        FROM note_ratings WHERE note_id = $1
      `;
      const avgResult = await client.query(avgSql, [noteId]);
      const newAverage = avgResult.rows[0]!.average_rating;
      const newCount = avgResult.rows[0]!.count;

      await client.query(
        "UPDATE notes SET average_rating = $1, rating_count = $2 WHERE id = $3",
        [newAverage, newCount, noteId]
      );

      await client.query("COMMIT");
      return { average_rating: newAverage, rating_count: newCount };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  static async reportNote(userId: string, noteId: string, reason: string): Promise<boolean> {
    // Basic deduplication for same reason/user/note
    const checkRes = await query("SELECT id FROM note_reports WHERE user_id = $1 AND note_id = $2 AND reason = $3", [userId, noteId, reason]);
    if (checkRes.rowCount && checkRes.rowCount > 0) return false; // Already reported for this reason

    await query("INSERT INTO note_reports (user_id, note_id, reason) VALUES ($1, $2, $3)", [userId, noteId, reason]);
    return true;
  }

  static async incrementViews(noteId: string): Promise<void> {
    await query("UPDATE notes SET views_count = views_count + 1 WHERE id = $1", [noteId]);
  }

  static async incrementDownloads(noteId: string): Promise<void> {
    await query("UPDATE notes SET downloads_count = downloads_count + 1 WHERE id = $1", [noteId]);
  }
  
  static async featureNote(noteId: string): Promise<boolean> {
    const res = await query("UPDATE notes SET is_featured = TRUE WHERE id = $1 AND deleted_at IS NULL RETURNING id", [noteId]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  static async unfeatureNote(noteId: string): Promise<boolean> {
    const res = await query("UPDATE notes SET is_featured = FALSE WHERE id = $1 AND deleted_at IS NULL RETURNING id", [noteId]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  static async hideNote(noteId: string): Promise<boolean> {
    const res = await query("UPDATE notes SET status = 'HIDDEN' WHERE id = $1 AND deleted_at IS NULL RETURNING id", [noteId]);
    return res.rowCount !== null && res.rowCount > 0;
  }
  
  static async updateNote(noteId: string, data: any): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        fields.push(`${dbCol} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return this.getNoteById(noteId);

    fields.push(`updated_at = NOW()`);
    values.push(noteId);

    const sql = `UPDATE notes SET ${fields.join(", ")} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`;
    const res = await query(sql, values);
    return res.rows[0];
  }
  
  static async getMyRating(userId: string, noteId: string): Promise<number | null> {
      const res = await query("SELECT rating FROM note_ratings WHERE user_id = $1 AND note_id = $2", [userId, noteId]);
      if ((res?.rowCount ?? 0) > 0) return res.rows[0]!.rating;
      return null;
  }
  
  static async isNoteSaved(userId: string, noteId: string): Promise<boolean> {
      const res = await query("SELECT id FROM note_saves WHERE user_id = $1 AND note_id = $2", [userId, noteId]);
      return (res?.rowCount ?? 0) > 0;
  }
}
