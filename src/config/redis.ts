import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

// ioredis can accept a URL string directly.  We configure by
// passing the REDIS_URL environment variable into the constructor.
// This keeps all connection configuration in one place.

export const redis = new Redis(env.REDIS_URL);

redis.on("connect", () => {
  logger.info("Redis client connected");
});

redis.on("error", (err) => {
  logger.error(err, "Redis error");
});

/**
 * Gracefully close the redis connection pool.
 */
export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info("Redis connection closed");
  } catch (error) {
    logger.error(error, "Failed to close Redis connection");
  }
}
