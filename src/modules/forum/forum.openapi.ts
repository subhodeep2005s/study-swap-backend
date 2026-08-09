import { z } from "zod";
import { registry } from "@/config/openapi";
import {
  createPostSchema,
  generateProfileSchema,
  updateProfileSchema,
  createCommentSchema,
  reportSchema,
  votePollSchema,
  blockProfileSchema,
} from "./forum.schema";

// ─── Shared Zod schemas (used as response bodies) ─────────────────────────────

const zMedia = z.object({
  id:        z.string().uuid(),
  url:       z.string().url(),
  mime_type: z.string().describe("e.g. image/jpeg, video/mp4"),
  size:      z.number().describe("bytes"),
  type:      z.enum(["IMAGE", "VIDEO", "DOCUMENT"]),
});

const zAnonymousProfile = z.object({
  id:           z.string().uuid(),
  display_name: z.string().describe("e.g. 'Anonymous Bright Fox'"),
  avatar_url:   z.string().url().nullable(),
});

const zCategory = z.object({
  id:          z.string().uuid(),
  name:        z.string().describe("e.g. 'Exam Stress'"),
  description: z.string().nullable().optional(),
  emoji:       z.string().nullable().optional(),
});

const zPollOption = z.object({
  id:         z.string().uuid(),
  text:       z.string(),
  vote_count: z.number(),
  voted:      z.boolean(),
});

const zPoll = z.object({
  id:          z.string().uuid(),
  expires_at:  z.string().nullable(),
  total_votes: z.number(),
  options:     z.array(zPollOption),
});

const zPostSummary = z.object({
  id:            z.string().uuid(),
  title:         z.string(),
  content:       z.string(),
  type:          z.enum(["STORY", "QUESTION", "RANT", "ADVICE", "DISCUSSION", "POLL"]),
  category:      z.string(),
  author_name:   z.string(),
  author_avatar: z.string().nullable(),
  likes:         z.number(),
  comments:      z.number(),
  viewer_liked:  z.boolean(),
  viewer_saved:  z.boolean(),
  media:         z.array(zMedia),
  created_at:    z.string().datetime(),
});

const zPostDetail = zPostSummary.extend({
  poll: zPoll.nullable(),
});

const zComment = z.object({
  id:                z.string().uuid(),
  content:           z.string(),
  parent_comment_id: z.string().uuid().nullable(),
  author_name:       z.string(),
  author_avatar:     z.string().nullable(),
  likes:             z.number(),
  viewer_liked:      z.boolean(),
  created_at:        z.string().datetime(),
});

const zPaginatedMeta = z.object({
  nextCursor: z.string().nullable(),
  hasMore:    z.boolean(),
});

const zSuccess = z.object({ success: z.boolean() });
const zSuccessMsg = zSuccess.extend({ message: z.string() });

const zReactionData = z.object({
  active: z.boolean().describe("true = reaction is now ON, false = removed"),
  count:  z.number().describe("Updated reaction count after toggle"),
});

// ─── Profile ──────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/forum/profile",
  tags: ["Anonymous Forum"],
  summary: "Get the caller's anonymous profile",
  description: "Returns the caller's current anonymous identity (display name, avatar key, avatar url). Generates one if it doesn't exist.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Anonymous profile fetched successfully",
      content: {
        "application/json": {
          schema: zSuccess.extend({ data: zAnonymousProfile }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/forum/profile",
  tags: ["Anonymous Forum"],
  summary: "Generate or fetch the caller's anonymous profile",
  description:
    "Idempotent — always returns the same persistent anonymous identity " +
    "(e.g. 'Anonymous Bright Fox'). Optionally attach a custom avatar via a pre-uploaded S3 key. " +
    "**Rate limit:** 10 / hour.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: generateProfileSchema.shape.body } },
    },
  },
  responses: {
    200: {
      description: "Anonymous profile (created or fetched)",
      content: {
        "application/json": {
          schema: zSuccess.extend({ data: zAnonymousProfile }),
        },
      },
    },
    429: { description: "Rate limit exceeded" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/forum/profile",
  tags: ["Anonymous Forum"],
  summary: "Update the caller's anonymous profile",
  description: "Updates the display name or avatar. Validates uniqueness of display name.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: updateProfileSchema.shape.body } },
    },
  },
  responses: {
    200: {
      description: "Profile updated successfully",
      content: {
        "application/json": {
          schema: zSuccess.extend({ data: zAnonymousProfile }),
        },
      },
    },
    400: { description: "Validation error or name taken" },
    404: { description: "Profile not found" },
  },
});

// ─── Categories ───────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/forum/categories",
  tags: ["Anonymous Forum"],
  summary: "List all post categories",
  description: "Returns all available categories (e.g. Exam Stress, Success Stories). Used to populate the post composer picker.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Category list",
      content: {
        "application/json": {
          schema: zSuccess.extend({ data: z.array(zCategory) }),
        },
      },
    },
  },
});

// ─── Posts ────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/forum/posts",
  tags: ["Anonymous Forum"],
  summary: "Create a new anonymous post",
  description:
    "Creates a post under the caller's anonymous identity. " +
    "For `POLL` type, `poll.options` is required. " +
    "Media is attached by passing `objectKey` + `url` from a prior S3 presigned-URL upload " +
    "(up to 4 media items: images, videos, documents). " +
    "**Rate limit:** 5 posts / 10 minutes.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createPostSchema.shape.body } },
    },
  },
  responses: {
    201: {
      description: "Post created",
      content: {
        "application/json": {
          schema: zSuccessMsg.extend({ data: z.object({ id: z.string().uuid() }) }),
        },
      },
    },
    400: { description: "Validation error — e.g. POLL type without options, invalid media MIME" },
    401: { description: "Authentication required" },
    429: { description: "Rate limit exceeded" },
  },
});

registry.registerPath({
  method: "get",
  path: "/forum/posts",
  tags: ["Anonymous Forum"],
  summary: "Feed — list anonymous posts (cursor-paginated)",
  description:
    "Returns the forum feed, optionally filtered by category. " +
    "Cursor is the `created_at` ISO timestamp of the last post in the current page. " +
    "Posts from blocked anonymous profiles are excluded. " +
    "Default page size: 20. Max: 50.",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      categoryId: z.string().uuid().optional().describe("Filter by category UUID"),
      cursor:     z.string().optional().describe("ISO timestamp cursor for 'new' sorting, or integer offset for other sorts"),
      limit:      z.string().optional().describe("Page size (default 20, max 50)"),
      sortBy:     z.enum(["new", "trending", "most_discussed", "most_liked"]).optional().describe("Sort by (default: new)"),
    }),
  },
  responses: {
    200: {
      description: "Paginated feed",
      content: {
        "application/json": {
          schema: zSuccess.extend({
            data: z.object({
              posts: z.array(zPostDetail),
              meta:  zPaginatedMeta,
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/forum/posts/saved",
  tags: ["Anonymous Forum"],
  summary: "Get saved anonymous posts (cursor-paginated)",
  description: "Returns the posts saved by the caller.",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      cursor: z.string().optional().describe("ISO timestamp cursor for pagination"),
      limit:  z.string().optional().describe("Page size (default 20, max 50)"),
    }),
  },
  responses: {
    200: {
      description: "Paginated saved posts",
      content: {
        "application/json": {
          schema: zSuccess.extend({
            data: z.object({
              posts: z.array(zPostDetail),
              meta:  zPaginatedMeta,
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/forum/posts/{id}",
  tags: ["Anonymous Forum"],
  summary: "Get a single post with full detail (media + poll)",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Full post detail including poll options and media",
      content: {
        "application/json": {
          schema: zSuccess.extend({ data: zPostDetail }),
        },
      },
    },
    403: { description: "Post author is blocked by caller or caller is blocked by author" },
    404: { description: "Post not found or deleted" },
  },
});

// ─── Comments ─────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/forum/posts/{id}/comments",
  tags: ["Anonymous Forum"],
  summary: "Add a comment to a post",
  description:
    "Creates a comment under the caller's anonymous identity. " +
    "Pass `parentCommentId` to reply to an existing comment (single nesting level). " +
    "Sends a push notification to the post owner — sender identity is obfuscated. " +
    "**Rate limit:** 20 comments / 10 minutes.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: createCommentSchema.shape.body } },
    },
  },
  responses: {
    201: {
      description: "Comment created",
      content: {
        "application/json": {
          schema: zSuccess.extend({ data: zComment }),
        },
      },
    },
    400: { description: "Validation error" },
    404: { description: "Post not found" },
    429: { description: "Rate limit exceeded" },
  },
});

registry.registerPath({
  method: "get",
  path: "/forum/posts/{id}/comments",
  tags: ["Anonymous Forum"],
  summary: "List comments for a post (cursor-paginated)",
  description: "Returns top-level comments with their replies inline. Ordered by newest first.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({
      cursor: z.string().optional(),
      limit:  z.string().optional().describe("Default 20"),
    }),
  },
  responses: {
    200: {
      description: "Comment page",
      content: {
        "application/json": {
          schema: zSuccess.extend({
            data: z.object({
              comments: z.array(zComment),
              meta:     zPaginatedMeta,
            }),
          }),
        },
      },
    },
  },
});

// ─── Reactions ────────────────────────────────────────────────────────────────

const reactionResponses = {
  200: {
    description: "Toggle successful — returns new `active` state and updated `count`",
    content: {
      "application/json": {
        schema: zSuccess.extend({ data: zReactionData }),
      },
    },
  },
  404: { description: "Post not found" },
  429: { description: "Rate limit exceeded — 60 reactions per minute" },
};

registry.registerPath({
  method: "post",
  path: "/forum/posts/{id}/like",
  tags: ["Anonymous Forum"],
  summary: "Toggle Like on a post",
  description:
    "Idempotent toggle — calling twice removes the like. " +
    "Sends push notification to post author on first like. " +
    "**Rate limit:** 60 reactions / minute.",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: reactionResponses,
});



registry.registerPath({
  method: "post",
  path: "/forum/posts/{id}/save",
  tags: ["Anonymous Forum"],
  summary: "Toggle Save (bookmark) on a post",
  description:
    "Saves or unsaves the post privately — no notification sent to author. " +
    "**Rate limit:** 60 reactions / minute.",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: reactionResponses,
});

// ─── Polls ────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/forum/polls/{id}/vote",
  tags: ["Anonymous Forum"],
  summary: "Vote on a poll option",
  description:
    "Records a vote for a specific option. Each user can vote only once per poll " +
    "(unique DB constraint — returns 409 on duplicate). " +
    "**Rate limit:** 20 votes / minute.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid().describe("Poll UUID") }),
    body: {
      content: { "application/json": { schema: votePollSchema.shape.body } },
    },
  },
  responses: {
    200: {
      description: "Vote recorded — returns updated vote counts for all options",
      content: {
        "application/json": {
          schema: zSuccess.extend({
            data: z.object({
              total_votes: z.number(),
              options:     z.array(zPollOption),
            }),
          }),
        },
      },
    },
    404: { description: "Poll not found" },
    409: { description: "User has already voted on this poll" },
    429: { description: "Rate limit exceeded" },
  },
});

// ─── Moderation ───────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/forum/reports",
  tags: ["Anonymous Forum"],
  summary: "Report a post, comment, or anonymous profile",
  description:
    "Submits a moderation report. The real `user_id` of the target is resolved internally. " +
    "Reporters remain anonymous to each other. " +
    "**Rate limit:** 5 reports / hour.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: reportSchema.shape.body } },
    },
  },
  responses: {
    200: {
      description: "Report submitted",
      content: {
        "application/json": {
          schema: zSuccessMsg,
        },
      },
    },
    400: { description: "Validation error" },
    429: { description: "Rate limit exceeded" },
  },
});

registry.registerPath({
  method: "post",
  path: "/forum/blocks",
  tags: ["Anonymous Forum"],
  summary: "Block an anonymous profile",
  description:
    "Hides all posts and comments from the blocked profile from the caller's feed and detail views. " +
    "Block is stored using the real `user_id` internally — not the anonymous profile ID — " +
    "to survive identity regeneration.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: blockProfileSchema.shape.body } },
    },
  },
  responses: {
    200: {
      description: "Profile blocked",
      content: {
        "application/json": {
          schema: zSuccessMsg,
        },
      },
    },
    404: { description: "Anonymous profile not found" },
  },
});
