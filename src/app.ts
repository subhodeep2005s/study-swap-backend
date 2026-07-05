import "@/config/openapi";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import { authSubscribers, mentorSubscribers, matchSubscribers } from "@/core/events";
import { auditMiddleware } from "@/core/middleware/audit.middleware";
import { requestLogger } from "@/core/middleware/logger.middleware";

import authRoutes from "@/modules/auth/auth.routes";
import onboardingRoutes from "@/modules/onboarding/onboarding.routes";
import countriesRoutes from "@/modules/countries/countries.routes";
import examsRoutes from "@/modules/exams/exams.routes";
import adminRoutes from "@/modules/admin/admin.routes";
import matchesRoutes from "@/modules/matches/matches.routes";
import { mentorsRoutes } from "@/modules/mentors/mentors.routes";
import { mentorBookingsRoutes } from "@/modules/mentor-bookings/mentor-bookings.routes";
import { uploadsRoutes } from "@/modules/uploads/uploads.routes";
import storiesRoutes from "@/modules/stories/stories.routes";
import communicationRoutes from "@/modules/communication/communication.routes";

import { env } from "./config/env";
import { scalarMiddleware } from "./config/scalar";
import { generateOpenApiDocument } from "./config/openapi";
import { errorHandler, notFoundHandler } from "./core/errors/errorHandler";

export function createApp(): Application {
  const app = express();

  app.use("/docs", scalarMiddleware);
  
  app.get("/openapi", (_req: Request, res: Response) => {
    res.json(generateOpenApiDocument());
  });

  app.use(helmet());

  authSubscribers();
  mentorSubscribers();
  matchSubscribers();

  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(auditMiddleware);

  app.use("/auth", authRoutes);
  app.use("/onboarding", onboardingRoutes);
  app.use("/countries", countriesRoutes);
  app.use("/exams", examsRoutes);
  app.use("/admin", adminRoutes);
  app.use("/matches", matchesRoutes);
  app.use("/mentors", mentorsRoutes);
  app.use("/mentor", mentorBookingsRoutes);
  app.use("/uploads", uploadsRoutes);
  app.use("/stories", storiesRoutes);
  app.use("/communication", communicationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
