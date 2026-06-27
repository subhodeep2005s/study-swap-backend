import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { closePool } from "./config/db";
import { closeRedis } from "./config/redis";

async function startServer(): Promise<void> {
  try {
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`${signal} received, shutting down gracefully`);

      server.close(async () => {
        logger.info("HTTP server closed");

        try {
          await closePool();
          logger.info("Database pool closed");
        } catch {}

        try {
          await closeRedis();
          logger.info("Redis connection closed");
        } catch {}

        process.exit(0);
      });

      // Force exit after 10s if graceful shutdown hangs
      setTimeout(() => {
        logger.error("Graceful shutdown timed out, forcing exit");
        process.exit(1);
      }, 10_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error(error, "Failed to start server");
    process.exit(1);
  }
}

startServer();
