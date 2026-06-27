import rateLimit from "express-rate-limit";

export const rateLimitConfig = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimitConfig = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
