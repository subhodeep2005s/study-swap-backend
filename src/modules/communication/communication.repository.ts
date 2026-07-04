import { getClient, query } from "@/config/db";
import type { PoolClient } from "pg";
import { cursorPayloadSchema } from "./communication.schema";

export class CommunicationRepository {
  static async validateMatchAndGetPartner(conversationId: string, userId: string) {
    const res = await query(`
      SELECT um.user_id, um.matched_user_id, um.status 
      FROM conversations c
      JOIN user_matches um ON um.id = c.match_id
      WHERE c.id = $1
    `, [conversationId]);
    return res.rows[0];
  }
  /**
   * Idempotent conversation creation.
   * Returns the conversation if it exists, otherwise creates it.
   */
  static async getOrCreateConversation(matchId: string): Promise<string> {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const existing = await client.query(
        "SELECT id FROM conversations WHERE match_id = $1",
        [matchId]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        await client.query("COMMIT");
        return existing.rows[0].id;
      }

      const created = await client.query(
        "INSERT INTO conversations (match_id) VALUES ($1) RETURNING id",
        [matchId]
      );
      
      await client.query("COMMIT");
      return created.rows[0].id;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async getConversationsList(userId: string) {
    // This query is a beast, it joins conversations, user_matches, messages, and profiles
    // We get the matches where user is involved, and accepted.
    const result = await query(`
      SELECT 
        c.id as "conversationId",
        um.id as "matchId",
        um.status as "matchStatus",
        m.id as "lastMessageId",
        m.message_type as "lastMessageType",
        m.message as "lastMessageText",
        m.created_at as "lastMessageAt",
        m.sender_id as "lastMessageSenderId",
        (SELECT count(*) FROM messages m2 WHERE m2.conversation_id = c.id AND m2.sender_id != $1 AND m2.read_at IS NULL) as "unreadCount",
        CASE WHEN um.user_id = $1 THEN um.matched_user_id ELSE um.user_id END as "partnerId",
        p.full_name as "partnerName",
        p.profile_image as "partnerImage"
      FROM conversations c
      JOIN user_matches um ON um.id = c.match_id
      LEFT JOIN messages m ON m.id = c.last_message_id
      JOIN profiles p ON p.user_id = (CASE WHEN um.user_id = $1 THEN um.matched_user_id ELSE um.user_id END)
      WHERE (um.user_id = $1 OR um.matched_user_id = $1) AND um.status = 'accepted'
      ORDER BY c.updated_at DESC
    `, [userId]);

    return result.rows;
  }

  static async getConversation(conversationId: string) {
    const result = await query(
      "SELECT id, match_id, last_message_id, created_at, updated_at FROM conversations WHERE id = $1",
      [conversationId]
    );
    return result.rows[0]!;
  }

  static async saveMessage(
    client: PoolClient,
    conversationId: string, 
    senderId: string, 
    type: string, 
    message?: string, 
    replyToId?: string
  ) {
    const result = await client.query(`
      INSERT INTO messages (conversation_id, sender_id, message_type, message, reply_to_message_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [conversationId, senderId, type, message || null, replyToId || null]);
    
    return result.rows[0]!;
  }

  static async saveAttachment(
    client: PoolClient,
    messageId: string,
    uploadedBy: string,
    attachment: {
      url: string;
      filename: string;
      mimeType: string;
      extension: string;
      size: number;
      durationSeconds?: number;
      thumbnailUrl?: string;
      checksum?: string;
    }
  ) {
    const result = await client.query(`
      INSERT INTO message_attachments (message_id, uploaded_by, url, filename, mime_type, extension, size, duration_seconds, thumbnail_url, checksum)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      messageId, uploadedBy, attachment.url, attachment.filename, attachment.mimeType, 
      attachment.extension, attachment.size, attachment.durationSeconds || null, 
      attachment.thumbnailUrl || null, attachment.checksum || null
    ]);
    return result.rows[0]!;
  }

  static async updateConversationLastMessage(client: PoolClient, conversationId: string, messageId: string) {
    await client.query(`
      UPDATE conversations 
      SET last_message_id = $1, updated_at = NOW() 
      WHERE id = $2
    `, [messageId, conversationId]);
  }

  static async getMessagesCursor(conversationId: string, cursor?: string, limit = 30) {
    let sql = `
      SELECT m.*, 
        json_build_object(
          'url', a.url, 'filename', a.filename, 'mimeType', a.mime_type, 
          'extension', a.extension, 'size', a.size, 'durationSeconds', a.duration_seconds, 
          'thumbnailUrl', a.thumbnail_url
        ) as attachment
      FROM messages m
      LEFT JOIN message_attachments a ON a.message_id = m.id
      WHERE m.conversation_id = $1
    `;
    const params: any[] = [conversationId];

    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        const validated = cursorPayloadSchema.parse(decoded);
        params.push(validated.createdAt, validated.id);
        sql += ` AND (m.created_at, m.id) < ($2, $3)`;
      } catch (err) {
        // invalid cursor, ignore
      }
    }

    sql += ` ORDER BY m.created_at DESC, m.id DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1); // Fetch one extra to determine if there's a next page

    const result = await query(sql, params);
    
    // Post-process to remove attachment object if it's full of nulls (no attachment)
    const rows = result.rows.map(row => {
      if (!row.attachment.url) {
        delete row.attachment;
      }
      return row;
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0
      ? Buffer.from(JSON.stringify({ createdAt: items[items.length - 1]!.created_at, id: items[items.length - 1]!.id })).toString('base64')
      : null;

    return { items, nextCursor };
  }

  static async getAttachmentsCursor(conversationId: string, cursor?: string, limit = 30) {
    let sql = `
      SELECT m.*, 
        json_build_object(
          'url', a.url, 'filename', a.filename, 'mimeType', a.mime_type, 
          'extension', a.extension, 'size', a.size, 'durationSeconds', a.duration_seconds, 
          'thumbnailUrl', a.thumbnail_url
        ) as attachment
      FROM messages m
      JOIN message_attachments a ON a.message_id = m.id
      WHERE m.conversation_id = $1 AND m.message_type IN ('IMAGE', 'VIDEO', 'FILE', 'VOICE_NOTE')
    `;
    const params: any[] = [conversationId];

    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        const validated = cursorPayloadSchema.parse(decoded);
        params.push(validated.createdAt, validated.id);
        sql += ` AND (m.created_at, m.id) < ($2, $3)`;
      } catch (err) {
        // invalid cursor, ignore
      }
    }

    sql += ` ORDER BY m.created_at DESC, m.id DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);

    const result = await query(sql, params);
    const rows = result.rows;

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0
      ? Buffer.from(JSON.stringify({ createdAt: items[items.length - 1]!.created_at, id: items[items.length - 1]!.id })).toString('base64')
      : null;

    return { items, nextCursor };
  }

  static async getMessageById(client: PoolClient | null, messageId: string) {
    const q = client ? client.query.bind(client) : query;
    const result = await q("SELECT * FROM messages WHERE id = $1", [messageId]);
    return result.rows[0];
  }

  static async updateMessageDeleted(client: PoolClient, messageId: string) {
    const result = await client.query(`
      UPDATE messages 
      SET deleted_at = NOW(), message = NULL, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `, [messageId]);
    return result.rows[0]!;
  }

  static async updateMessageText(client: PoolClient, messageId: string, newText: string) {
    const result = await client.query(`
      UPDATE messages 
      SET message = $1, edited_at = NOW(), updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, [newText, messageId]);
    return result.rows[0]!;
  }

  static async markMessagesRead(conversationId: string, userId: string) {
    const result = await query(`
      UPDATE messages 
      SET read_at = NOW() 
      WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL
      RETURNING id, read_at
    `, [conversationId, userId]);
    return result.rows;
  }

  static async getActiveCall(conversationId: string) {
    const result = await query(
      "SELECT * FROM call_sessions WHERE conversation_id = $1 AND status IN ('RINGING', 'ACTIVE')",
      [conversationId]
    );
    return result.rows[0];
  }

  static async getCallById(callId: string) {
    const result = await query("SELECT * FROM call_sessions WHERE id = $1", [callId]);
    return result.rows[0];
  }

  static async getCallByIdForUpdate(client: PoolClient, callId: string) {
    const result = await client.query("SELECT * FROM call_sessions WHERE id = $1 FOR UPDATE", [callId]);
    return result.rows[0];
  }

  static async createCall(client: PoolClient, conversationId: string, callerId: string, type: string, roomName: string) {
    const result = await client.query(`
      INSERT INTO call_sessions (conversation_id, caller_id, type, status, room_name)
      VALUES ($1, $2, $3, 'RINGING', $4)
      RETURNING *
    `, [conversationId, callerId, type, roomName]);
    return result.rows[0]!;
  }

  static async updateCallStatus(client: PoolClient, callId: string, status: string, reason?: string) {
    const now = new Date();
    const endedAt = (status === 'ENDED') ? now : null;
    const startedAt = (status === 'ACTIVE') ? now : null;
    const result = await client.query(`
      UPDATE call_sessions 
      SET status = $1, ended_reason = $2, ended_at = COALESCE($3, ended_at), 
          started_at = COALESCE($5, started_at), updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, reason || null, endedAt, callId, startedAt]);
    return result.rows[0]!;
  }

  static async getActiveFocus(conversationId: string) {
    const result = await query(
      "SELECT * FROM focus_sessions WHERE conversation_id = $1 AND status IN ('PENDING', 'ACTIVE')", 
      [conversationId]
    );
    return result.rows[0];
  }

  static async getFocusById(focusId: string) {
    const result = await query("SELECT * FROM focus_sessions WHERE id = $1", [focusId]);
    return result.rows[0];
  }

  static async getFocusByIdForUpdate(client: PoolClient, focusId: string) {
    const result = await client.query("SELECT * FROM focus_sessions WHERE id = $1 FOR UPDATE", [focusId]);
    return result.rows[0];
  }

  static async createFocus(client: PoolClient, conversationId: string, initiatorId: string, durationSeconds: number, roomName: string) {
    const result = await client.query(`
      INSERT INTO focus_sessions (conversation_id, initiator_id, duration_seconds, status, room_name)
      VALUES ($1, $2, $3, 'PENDING', $4)
      RETURNING *
    `, [conversationId, initiatorId, durationSeconds, roomName]);
    return result.rows[0]!;
  }

  static async updateFocusStatus(client: PoolClient, focusId: string, status: string, startedAt?: Date, endsAt?: Date) {
    const result = await client.query(`
      UPDATE focus_sessions 
      SET status = $1, started_at = COALESCE($2, started_at), ends_at = COALESCE($3, ends_at), updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, startedAt || null, endsAt || null, focusId]);
    return result.rows[0]!;
  }

  static async getCallHistory(conversationId: string, cursor?: string, limit = 30) {
    let sql = `
      SELECT * FROM call_sessions 
      WHERE conversation_id = $1
    `;
    const params: any[] = [conversationId];

    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        const validated = cursorPayloadSchema.parse(decoded);
        params.push(validated.createdAt, validated.id);
        sql += ` AND (created_at, id) < ($2, $3)`;
      } catch (err) {}
    }

    sql += ` ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);

    const result = await query(sql, params);
    const rows = result.rows;

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0
      ? Buffer.from(JSON.stringify({ createdAt: items[items.length - 1]!.created_at, id: items[items.length - 1]!.id })).toString('base64')
      : null;

    return { items, nextCursor };
  }

  static async getFocusHistory(conversationId: string, cursor?: string, limit = 30) {
    let sql = `
      SELECT * FROM focus_sessions 
      WHERE conversation_id = $1
    `;
    const params: any[] = [conversationId];

    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        const validated = cursorPayloadSchema.parse(decoded);
        params.push(validated.createdAt, validated.id);
        sql += ` AND (created_at, id) < ($2, $3)`;
      } catch (err) {}
    }

    sql += ` ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);

    const result = await query(sql, params);
    const rows = result.rows;

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0
      ? Buffer.from(JSON.stringify({ createdAt: items[items.length - 1]!.created_at, id: items[items.length - 1]!.id })).toString('base64')
      : null;

    return { items, nextCursor };
  }

  static async validateMembership(conversationId: string, userId: string): Promise<boolean> {
    const res = await query(`
      SELECT 1 FROM conversations c
      JOIN user_matches um ON um.id = c.match_id
      WHERE c.id = $1 AND (um.user_id = $2 OR um.matched_user_id = $2)
    `, [conversationId, userId]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  static async processMissedCalls() {
    const result = await query(`
      UPDATE call_sessions 
      SET status = 'ENDED', ended_reason = 'MISSED', ended_at = NOW()
      WHERE status = 'RINGING' AND created_at < NOW() - INTERVAL '60 seconds'
      RETURNING id, conversation_id, room_name, caller_id
    `);
    return result.rows;
  }

  static async processCancelledFocus() {
    const result = await query(`
      UPDATE focus_sessions 
      SET status = 'CANCELLED'
      WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '60 seconds'
      RETURNING id, conversation_id
    `);
    return result.rows;
  }

  static async processCompletedFocus() {
    const result = await query(`
      UPDATE focus_sessions fs
      SET status = 'COMPLETED'
      FROM conversations c
      JOIN user_matches um ON um.id = c.match_id
      WHERE fs.status = 'ACTIVE' 
        AND fs.ends_at <= NOW() 
        AND fs.conversation_id = c.id
      RETURNING fs.id, fs.conversation_id, um.user_id as user1, um.matched_user_id as user2
    `);
    return result.rows;
  }
}
