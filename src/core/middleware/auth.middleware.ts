import { logger } from "@/config/logger";
import { query } from "@/config/db";
import { AppError } from "@core/errors/AppError";
import { verifyToken } from "@core/utils/jwt";
import type { NextFunction, Request, Response } from "express";

interface UserRow {
  id: string;
  email: string;
  is_active: boolean;
  is_deleted: boolean;
  is_verified: boolean;
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Auth failed: No token provided");
      throw new AppError("No token provided", 401);
    }

    const token = authHeader.split(" ")[1] as string;
    const decoded = verifyToken(token);

    if (!decoded) {
      logger.warn("Auth failed: Invalid token");
      throw new AppError("Invalid token", 401);
    }

    if (decoded.role === "admin" && decoded.id === "admin") {
      req.user = {
        id: "admin",
        email: decoded.email,
        role: "admin",
      };
      logger.debug({ role: "admin" }, "Admin auth successful");
      next();
      return;
    }

    const result = await query<UserRow>(
      "SELECT id, email, is_active, is_deleted, is_verified FROM users WHERE id = $1",
      [decoded.id],
    );

    if (result.rows.length === 0) {
      logger.warn({ userId: decoded.id }, "Auth failed: User not found");
      throw new AppError("User not found", 401);
    }

    const user = result.rows[0]!;

    if (user.is_deleted) {
      logger.warn({ userId: user.id }, "Auth failed: Account deleted");
      throw new AppError("Account has been deleted", 401);
    }

    if (!user.is_active) {
      logger.warn({ userId: user.id }, "Auth failed: Account inactive");
      throw new AppError("Account is inactive", 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: "user",
      isVerified: user.is_verified,
    };

    logger.debug({ userId: user.id, role: "user" }, "Auth successful");
    next();
  } catch (error) {
    next(error);
  }
}
