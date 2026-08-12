import { Router, type Request, type Response, type NextFunction } from "express";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { validate } from "@/core/middleware/validate.middleware";
import { NotesController } from "./notes.controller";
import {
  presignedUrlBodySchema,
  uploadNoteBodySchema,
  updateNoteBodySchema,
  rateNoteBodySchema,
  reportNoteBodySchema,
  getNotesQuerySchema,
  getMyNotesQuerySchema,
} from "./notes.schema";
import { ForbiddenError } from "@/core/errors/AppError";

export const notesRoutes = Router();

import "./notes.openapi";

const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    next(new ForbiddenError("Admin access required."));
    return;
  }
  next();
};

// -- Discovery & Search --
notesRoutes.get(
  "/",
  authMiddleware,
  validate(getNotesQuerySchema),
  NotesController.getNotes
);

notesRoutes.get(
  "/categories",
  NotesController.getCategories
);

notesRoutes.get(
  "/filters",
  NotesController.getFilters
);

notesRoutes.get(
  "/context",
  authMiddleware,
  NotesController.getContext
);

// -- My Notes --
notesRoutes.get(
  "/me",
  authMiddleware,
  validate(getMyNotesQuerySchema),
  NotesController.getMyNotes
);

// -- Upload Flow --
notesRoutes.post(
  "/presigned-url",
  authMiddleware,
  validate(presignedUrlBodySchema),
  NotesController.generatePresignedUrl
);

notesRoutes.post(
  "/",
  authMiddleware,
  validate(uploadNoteBodySchema),
  NotesController.createNote
);

// -- Saves --
notesRoutes.get(
  "/saved",
  authMiddleware,
  NotesController.getSavedNotes
);

notesRoutes.post(
  "/:id/save",
  authMiddleware,
  NotesController.saveNote
);

notesRoutes.delete(
  "/:id/save",
  authMiddleware,
  NotesController.unsaveNote
);

// -- Note Details & Management --
notesRoutes.get(
  "/:id",
  authMiddleware,
  NotesController.getNoteById
);

notesRoutes.patch(
  "/:id",
  authMiddleware,
  validate(updateNoteBodySchema),
  NotesController.updateNote
);

notesRoutes.delete(
  "/:id",
  authMiddleware,
  NotesController.deleteNote
);

notesRoutes.post(
  "/:id/restore",
  authMiddleware,
  NotesController.restoreNote
);

// -- Engagement & Analytics --
notesRoutes.post(
  "/:id/view",
  authMiddleware, // Optional: could be public but auth makes deduplication easier
  NotesController.recordView
);

notesRoutes.post(
  "/:id/download",
  authMiddleware,
  NotesController.recordDownload
);

notesRoutes.post(
  "/:id/rating",
  authMiddleware,
  validate(rateNoteBodySchema),
  NotesController.rateNote
);

notesRoutes.patch(
  "/:id/rating",
  authMiddleware,
  validate(rateNoteBodySchema),
  NotesController.rateNote // upsert works for update
);

notesRoutes.delete(
  "/:id/rating",
  authMiddleware,
  NotesController.removeRating
);

// -- Reporting --
notesRoutes.post(
  "/:id/report",
  authMiddleware,
  validate(reportNoteBodySchema),
  NotesController.reportNote
);

// -- Admin Actions --
notesRoutes.post(
  "/:id/feature",
  authMiddleware,
  requireAdmin,
  NotesController.featureNote
);

notesRoutes.delete(
  "/:id/feature",
  authMiddleware,
  requireAdmin,
  NotesController.unfeatureNote
);

notesRoutes.post(
  "/:id/hide",
  authMiddleware,
  requireAdmin,
  NotesController.hideNote
);
