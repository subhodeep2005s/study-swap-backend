import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  createHallOfFameSchema,
  updateHallOfFameSchema,
  getAdminHallOfFameSchema,
  getPublicHallOfFameSchema,
  createCommentSchema,
  updateCommentSchema,
  StoryListResponseSchema,
  SingleStoryResponseSchema,
  FiltersResponseSchema,
  StatsResponseSchema,
  GenericSuccessResponseSchema,
  CommentListResponseSchema
} from "./hall-of-fame.schema";
import { registry } from "@/config/openapi";

extendZodWithOpenApi(z);

const errorResponse = {
  description: "Error response",
  content: {
    "application/json": {
      schema: z.object({
        success: z.boolean(),
        message: z.string(),
        error: z.string().optional(),
      }),
    },
  },
};

// Admin Routes
registry.registerPath({
  method: "post",
  path: "/admin/hall-of-fame",
  summary: "Create a new Hall of Fame story",
  tags: ["Admin - Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createHallOfFameSchema.shape.body } },
    },
  },
  responses: {
    201: { description: "Story created successfully" },
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/hall-of-fame/{id}",
  summary: "Update a Hall of Fame story",
  tags: ["Admin - Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updateHallOfFameSchema.shape.body } },
    },
  },
  responses: {
    200: { description: "Story updated successfully" },
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/hall-of-fame/{id}",
  summary: "Delete a Hall of Fame story",
  tags: ["Admin - Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: { description: "Story deleted successfully" },
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/hall-of-fame/{id}/publish",
  summary: "Publish a Hall of Fame story",
  tags: ["Admin - Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: { description: "Story published successfully" },
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/hall-of-fame/{id}/feature",
  summary: "Feature a Hall of Fame story",
  tags: ["Admin - Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: { description: "Story featured successfully" },
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/hall-of-fame",
  summary: "Get Hall of Fame stories (Admin)",
  tags: ["Admin - Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    query: getAdminHallOfFameSchema.shape.query,
  },
  responses: {
    200: { 
      description: "Stories retrieved successfully",
      content: { "application/json": { schema: StoryListResponseSchema } }
    },
    401: errorResponse,
    403: errorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/hall-of-fame/stats",
  summary: "Get Hall of Fame statistics",
  tags: ["Admin - Hall of Fame"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { 
      description: "Stats retrieved successfully",
      content: { "application/json": { schema: StatsResponseSchema } }
    },
    401: errorResponse,
    403: errorResponse,
  },
});

// Public Routes
registry.registerPath({
  method: "get",
  path: "/hall-of-fame",
  summary: "Browse Hall of Fame stories",
  tags: ["Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    query: getPublicHallOfFameSchema.shape.query,
  },
  responses: {
    200: { 
      description: "Stories retrieved successfully",
      content: { "application/json": { schema: StoryListResponseSchema } }
    },
    401: errorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/hall-of-fame/filters",
  summary: "Get available filters for Hall of Fame",
  tags: ["Hall of Fame"],
  responses: {
    200: { 
      description: "Filters retrieved successfully",
      content: { "application/json": { schema: FiltersResponseSchema } }
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/hall-of-fame/featured",
  summary: "Get featured Hall of Fame stories",
  tags: ["Hall of Fame"],
  responses: {
    200: { 
      description: "Featured stories retrieved successfully",
      content: { "application/json": { schema: StoryListResponseSchema } }
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/hall-of-fame/trending",
  summary: "Get trending Hall of Fame stories",
  tags: ["Hall of Fame"],
  responses: {
    200: { 
      description: "Trending stories retrieved successfully",
      content: { "application/json": { schema: StoryListResponseSchema } }
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/hall-of-fame/saved",
  summary: "Get saved Hall of Fame stories for current user",
  tags: ["Hall of Fame"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { 
      description: "Saved stories retrieved successfully",
      content: { "application/json": { schema: StoryListResponseSchema } }
    },
    401: errorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/hall-of-fame/recommended",
  summary: "Get recommended Hall of Fame stories for current user",
  tags: ["Hall of Fame"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { 
      description: "Recommended stories retrieved successfully",
      content: { "application/json": { schema: StoryListResponseSchema } }
    },
    401: errorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/hall-of-fame/{id}",
  summary: "Get a specific Hall of Fame story",
  tags: ["Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: { 
      description: "Story retrieved successfully",
      content: { "application/json": { schema: SingleStoryResponseSchema } }
    },
    404: errorResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/hall-of-fame/{id}/like",
  summary: "Like a Hall of Fame story",
  tags: ["Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: { description: "Story liked successfully" },
    401: errorResponse,
    404: errorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/hall-of-fame/{id}/comments",
  summary: "Get comments for a Hall of Fame story",
  tags: ["Hall of Fame"],
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({
      limit: z.string().optional(),
      cursor: z.string().optional()
    })
  },
  responses: {
    200: { 
      description: "Comments retrieved successfully",
      content: { "application/json": { schema: CommentListResponseSchema } }
    },
    404: errorResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/hall-of-fame/{id}/comments",
  summary: "Add a comment to a Hall of Fame story",
  tags: ["Hall of Fame"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: createCommentSchema.shape.body } },
    },
  },
  responses: {
    201: { description: "Comment added successfully" },
    400: errorResponse,
    401: errorResponse,
    404: errorResponse,
  },
});
