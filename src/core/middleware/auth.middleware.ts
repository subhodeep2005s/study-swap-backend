import { logger } from "@/config/logger";
import { query } from "@/config/db";
import { AppError } from "@core/errors/AppError";
import { verifyToken } from "@core/utils/jwt";
import type { NextFunction, Request, Response } from "express";

interface UserRow {
  id: string;
  email: string;
  role: "admin" | "student" | "mentor";
  email_verified: boolean;
  onboarding_completed: boolean;
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

    if (decoded.role === "admin") {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: "admin",
        emailVerified: true,
        onboardingCompleted: true,
      };
      logger.debug({ role: "admin" }, "Admin auth successful");
      next();
      return;
    }

    const result = await query<UserRow>(
      "SELECT id, email, role, email_verified, onboarding_completed FROM users WHERE id = $1",
      [decoded.id],
    );

    if (result.rows.length === 0) {
      logger.warn({ userId: decoded.id }, "Auth failed: User not found");
      throw new AppError("User not found", 401);
    }

    const user = result.rows[0]!;

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
      onboardingCompleted: user.onboarding_completed,
    };

    logger.debug({ userId: user.id, role: user.role }, "Auth successful");
    next();
  } catch (error) {
    next(error);
  }
}
