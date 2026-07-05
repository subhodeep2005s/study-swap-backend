import { registry } from "@/config/openapi";
import { z } from "zod";
import { storySchema } from "./stories.schema";

const tags = ["Stories"];
const security = [{ bearerAuth: [] }];

const StoryInput = registry.register("StoryInput", storySchema.shape.body);

registry.registerPath({
  method: "post",
  path: "/stories",
  tags,
  security,
  summary: "Upload story",
  description: "Upload a story image that is active for exactly 24 hours.",
  request: {
    body: {
      content: {
        "application/json": { schema: StoryInput },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/stories",
  tags,
  security,
  summary: "Delete story",
  description: "Delete the current user's active story.",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/stories/{userId}/view",
  tags,
  security,
  summary: "Record story view",
  description: "Record that the current user has viewed the specified user's story.",
  request: {
    params: z.object({
      userId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}),
          }),
        },
      },
    },
    404: {
      description: "Story not found or expired",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/stories/views",
  tags,
  security,
  summary: "Get story views",
  description: "Retrieve a list of profiles that viewed the current user's active story.",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              views: z.array(
                z.object({
                  userId: z.string().uuid(),
                  fullName: z.string().nullable(),
                  profileImage: z.string().nullable(),
                })
              ),
            }),
          }),
        },
      },
    },
  },
});
