import { logger } from "@/config/logger";
import { AuditLogService } from "@/core/services/audit-log.service";
import type { NextFunction, Request, Response } from "express";

export const auditMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if (!isMutation) {
    next();
    return;
  }

  const start = Date.now();

  // Hook into response finish to get final status code
  res.on("finish", () => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return;
      }

      const entity = req.baseUrl || req.path.split("/")[1] || "unknown";
      const action = `${req.method} ${req.originalUrl}`;

      // Clean up details
      const details = {
        body: req.body,
        query: req.query,
        params: req.params,
        durationMs: Date.now() - start,
      };

      // Remove sensitive fields if necessary
      if (details.body && typeof details.body === "object") {
        const safeBody = { ...details.body };
        delete safeBody.password;
        delete safeBody.token;
        details.body = safeBody;
      }

      // Fire and forget
      AuditLogService.log({
        userId: req.user.id,
        userRole: req.user.role || "unknown",
        action,
        entity,
        details,
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        statusCode: res.statusCode,
      }).catch((err) => {
        logger.error({ err }, "Audit log persistence failed asynchronously");
      });
    } catch (error) {
      logger.error({ error }, "Error within audit middleware finish hook");
    }
  });

  next();
};
