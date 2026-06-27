import { logger } from "@/config/logger";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    logger.warn({ path: req.path }, "RBAC failed: Unauthorized (no user)");
    next(new AppError("Unauthorized", 401));
    return;
  }

  if (req.user.role !== "admin") {
    logger.warn({ userId: req.user.id, role: req.user.role }, "RBAC failed: Admin access required");
    next(new AppError("Forbidden: Admin access required", 403));
    return;
  }

  next();
}

export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    logger.warn({ path: req.path }, "RBAC failed: Unauthorized (no user)");
    next(new AppError("Unauthorized", 401));
    return;
  }

  if (req.user.role !== "user") {
    logger.warn(
      { userId: req.user.id, role: req.user.role },
      "RBAC failed: User access required",
    );
    next(new AppError("Forbidden: User access required", 403));
    return;
  }

  if (!req.user.isVerified) {
    logger.warn({ userId: req.user.id }, "RBAC failed: User is unverified");
    next(new AppError("Please verify your account first", 403));
    return;
  }

  next();
}
