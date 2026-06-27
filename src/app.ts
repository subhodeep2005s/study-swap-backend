import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { authSubscribers } from "@/core/events";
import { auditMiddleware } from "@/core/middleware/audit.middleware";
import { requestLogger } from "@/core/middleware/logger.middleware";
import authRoutes from "@/modules/auth/auth.routes";
import { env } from "./config/env";
import { generateOpenApiDocument } from "./config/swagger";
import { errorHandler } from "./core/errors/errorHandler";

export function createApp(): Application {
  const app = express();

  app.use(helmet());

  authSubscribers();

  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));

  app.use(auditMiddleware);

  app.use("/auth", authRoutes);

  app.use(errorHandler);

  return app;
}
