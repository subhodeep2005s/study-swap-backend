import { logger } from "@/config/logger";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export function rbacMiddleware(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn({ path: req.path }, "RBAC failed: Unauthorized (no user)");
      next(new AppError("Unauthorized", 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        { userId: req.user.id, role: req.user.role, allowedRoles },
        "RBAC failed: Insufficient permissions",
      );
      next(new AppError("Forbidden: Insufficient permissions", 403));
      return;
    }

    next();
  };
}
