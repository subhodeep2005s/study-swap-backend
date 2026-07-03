import { Router } from "express";
import "./uploads.openapi";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { validate } from "@/core/middleware/validate.middleware";
import { generatePresignedUrl } from "./uploads.controller";
import { presignedUrlSchema } from "./uploads.schema";

export const uploadsRoutes = Router();

uploadsRoutes.post(
  "/presigned-url",
  authMiddleware,
  validate(presignedUrlSchema),
  generatePresignedUrl
);
