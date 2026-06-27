import { query } from "@/config/db";
import { eventEmitter, Event } from "@/config/event";
import { logger } from "@/config/logger";

export interface AuditLogPayload {
  userId: string;
  userRole: string;
  action: string;
  entity: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
}

export const AuditLogService = {
  async log(payload: AuditLogPayload): Promise<void> {
    try {
      const sql = `
                  INSERT INTO audit_logs (
                      user_id, user_role, action, entity, details, ip_address, user_agent, status_code
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                  RETURNING *
              `;
      const params = [
        payload.userId,
        payload.userRole,
        payload.action,
        payload.entity,
        payload.details ? JSON.stringify(payload.details) : "{}",
        payload.ipAddress || null,
        payload.userAgent || null,
        payload.statusCode || null,
      ];

      const result = await query(sql, params);

      const savedLog = result.rows[0];

      eventEmitter.emit(Event.AUDIT_LOG, {
        id: savedLog?.id,
        userId: payload.userId,
        userRole: payload.userRole,
        action: payload.action,
        entity: payload.entity,
        details: payload.details,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        statusCode: payload.statusCode,
        createdAt: savedLog?.created_at,
      });
    } catch (error) {
      logger.error({ error, payload }, "Failed to write audit log");
    }
  },
};
