import { registry } from "@/config/openapi";
import { z } from "zod";
import {
  noteTypeEnum,
  uploadNoteBodySchema,
  updateNoteBodySchema,
  presignedUrlBodySchema,
  rateNoteBodySchema,
  reportNoteBodySchema,
  getNotesQuerySchema,
  getMyNotesQuerySchema,
} from "./notes.schema";

const tags = ["Notes Hub"];
const security = [{ bearerAuth: [] }];

const UploadNoteBody = registry.register("UploadNoteBody", uploadNoteBodySchema.shape.body);
const UpdateNoteBody = registry.register("UpdateNoteBody", updateNoteBodySchema.shape.body);
const PresignedUrlBody = registry.register("PresignedUrlBody", presignedUrlBodySchema.shape.body);
const RateNoteBody = registry.register("RateNoteBody", rateNoteBodySchema.shape.body);
const ReportNoteBody = registry.register("ReportNoteBody", reportNoteBodySchema.shape.body);

const NoteItemResponse = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  note_type: z.string(),
  status: z.string(),
  is_featured: z.boolean(),
  file_url: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  mime_type: z.string(),
  file_size: z.number(),
  views_count: z.number(),
  downloads_count: z.number(),
  avg_rating: z.number().nullable(),
  rating_count: z.number(),
  uploader_id: z.string().uuid(),
  uploader_name: z.string().nullable().optional(),
  uploader_avatar_url: z.string().nullable().optional(),
  created_at: z.string(),
}).passthrough();

const NoteItem = registry.register("NoteItem", NoteItemResponse);

const CursorPagination = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// =========================================================================
// Discovery & Search
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/notes",
  tags,
  security,
  summary: "Get notes (paginated, cursor-based)",
  description: "Search and filter notes with cursor-based pagination. Supports text search, taxonomy filters, note type, uploader role, and sort order.",
  request: {
    query: getNotesQuerySchema.shape.query,
  },
  responses: {
    200: {
      description: "Notes fetched",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              items: z.array(NoteItem),
              nextCursor: z.string().nullable(),
              hasMore: z.boolean(),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/notes/context",
  tags,
  security,
  summary: "Get upload context",
  description: "Returns user's country, education node tree, and available taxonomy for note upload forms.",
  responses: {
    200: {
      description: "Context fetched",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.any(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/notes/categories",
  tags,
  security,
  summary: "Get notes categories",
  description: "Returns top education node categories with their note counts for the home screen.",
  responses: {
    200: {
      description: "Categories fetched",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.object({
              id: z.string().uuid(),
              name: z.string(),
              subtitle: z.string(),
              icon: z.string(),
              color: z.string(),
            })),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/notes/filters",
  tags,
  security,
  summary: "Get dynamic filter options",
  description: "Returns available dynamic filter options (categories, note types, uploaders) for filter modals.",
  responses: {
    200: {
      description: "Filters fetched",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              categories: z.array(z.string()),
              noteTypes: z.array(z.string()),
              uploaders: z.array(z.string()),
            }),
          }),
        },
      },
    },
  },
});

// =========================================================================
// My Notes
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/notes/me",
  tags,
  security,
  summary: "Get my notes",
  description: "Returns the authenticated user's own notes with cursor pagination. Supports filter by status (all, published, deleted).",
  request: {
    query: getMyNotesQuerySchema.shape.query,
  },
  responses: {
    200: {
      description: "My notes fetched",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              items: z.array(NoteItem),
              nextCursor: z.string().nullable(),
              hasMore: z.boolean(),
            }),
          }),
        },
      },
    },
  },
});

// =========================================================================
// Upload Flow
// =========================================================================
registry.registerPath({
  method: "post",
  path: "/notes/presigned-url",
  tags,
  security,
  summary: "Generate presigned upload URL",
  description: "Generates a pre-signed S3 URL for direct file upload from the client.",
  request: {
    body: { content: { "application/json": { schema: PresignedUrlBody } } },
  },
  responses: {
    200: {
      description: "Presigned URL generated",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              uploadUrl: z.string(),
              fileKey: z.string(),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/notes",
  tags,
  security,
  summary: "Create / upload a note",
  description: "Creates a new note record after file upload. Requires at least one taxonomy reference (country, board, class, course, subject, etc.).",
  request: {
    body: { content: { "application/json": { schema: UploadNoteBody } } },
  },
  responses: {
    201: {
      description: "Note published",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: NoteItem,
          }),
        },
      },
    },
  },
});

// =========================================================================
// Saves
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/notes/saved",
  tags,
  security,
  summary: "Get saved notes",
  description: "Returns all notes saved / bookmarked by the authenticated user.",
  responses: {
    200: {
      description: "Saved notes fetched",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.object({ items: z.array(NoteItem) }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/notes/{id}/save",
  tags,
  security,
  summary: "Save / bookmark a note",
  description: "Adds the note to the user's saved collection.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Note saved",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/notes/{id}/save",
  tags,
  security,
  summary: "Unsave / remove bookmark",
  description: "Removes the note from the user's saved collection.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Note removed from saved",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
  },
});

// =========================================================================
// Note Details & Management
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/notes/{id}",
  tags,
  security,
  summary: "Get note by ID",
  description: "Returns full note details including uploader info, ratings, and file metadata.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Note fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), data: NoteItem }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/notes/{id}",
  tags,
  security,
  summary: "Update note metadata",
  description: "Updates note title, description, type, or taxonomy references. Only the uploader or admin can update.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdateNoteBody } } },
  },
  responses: {
    200: {
      description: "Note updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: NoteItem }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/notes/{id}",
  tags,
  security,
  summary: "Delete note (soft delete)",
  description: "Soft-deletes the note. Only the uploader or admin can delete.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Note deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/notes/{id}/restore",
  tags,
  security,
  summary: "Restore a deleted note",
  description: "Restores a soft-deleted note. Only the uploader or admin can restore.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Note restored",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
  },
});

// =========================================================================
// Engagement & Analytics
// =========================================================================
registry.registerPath({
  method: "post",
  path: "/notes/{id}/view",
  tags,
  security,
  summary: "Record a view",
  description: "Records a view event for the note. Deduplicated per user.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "View recorded",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/notes/{id}/download",
  tags,
  security,
  summary: "Record a download",
  description: "Records a download event and returns a pre-signed download URL.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Download recorded",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({ downloadUrl: z.string() }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/notes/{id}/rating",
  tags,
  security,
  summary: "Rate a note",
  description: "Creates or updates a rating (1-5) for the note.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: RateNoteBody } } },
  },
  responses: {
    200: {
      description: "Note rated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/notes/{id}/rating",
  tags,
  security,
  summary: "Update rating",
  description: "Updates an existing rating for the note (upsert behavior).",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: RateNoteBody } } },
  },
  responses: {
    200: {
      description: "Rating updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/notes/{id}/rating",
  tags,
  security,
  summary: "Remove rating",
  description: "Removes the user's rating from the note.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Rating removed",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

// =========================================================================
// Reporting
// =========================================================================
registry.registerPath({
  method: "post",
  path: "/notes/{id}/report",
  tags,
  security,
  summary: "Report a note",
  description: "Submits a report against a note for moderation review.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: ReportNoteBody } } },
  },
  responses: {
    200: {
      description: "Note reported",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
  },
});

// =========================================================================
// Admin Actions (on user-facing notes routes)
// =========================================================================
registry.registerPath({
  method: "post",
  path: "/notes/{id}/feature",
  tags,
  security,
  summary: "Feature a note (Admin)",
  description: "Admin only. Marks a note as featured for prominence in feeds.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Note featured",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/notes/{id}/feature",
  tags,
  security,
  summary: "Unfeature a note (Admin)",
  description: "Admin only. Removes featured status from a note.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Note unfeatured",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/notes/{id}/hide",
  tags,
  security,
  summary: "Hide a note (Admin)",
  description: "Admin only. Hides a note from public view.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Note hidden",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
  },
});
