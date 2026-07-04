import { Request, Response, NextFunction } from "express";
import { redis } from "@/config/redis";
import { AppError } from "../errors/AppError";

export const rateLimitMiddleware = (limit: number, windowSeconds: number, prefix: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || req.ip || 'anonymous';
      const key = `ratelimit:${prefix}:${userId}`;

      const results = await redis.multi()
        .incr(key)
        .expire(key, windowSeconds, "NX")
        .exec();

      const currentCount = results?.[0]?.[1] as number || 0;

      if (currentCount > limit) {
        throw new AppError("Too many requests, please try again later.", 429);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
