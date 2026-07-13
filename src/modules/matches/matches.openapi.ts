import { registry } from "@/config/openapi";
import { z } from "zod";

const tags = ["Matches"];
const security = [{ bearerAuth: [] }];

const matchSchema = registry.register("Match", z.object({
  matchId: z.string().uuid(),
  userId: z.string().uuid(),
  fullName: z.string().nullable(),
  profileImage: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.string().nullable(),
  state: z.string().nullable(),
  bio: z.string().nullable(),
  strongIn: z.string().nullable(),
  needHelpWith: z.string().nullable(),
  studyTime: z.string().nullable(),
  lookingFor: z.array(z.string()).nullable(),
  selectedEducationNodes: z.array(z.string()),
  matchedBy: z.enum(["exam_state", "exam"]).openapi({ description: "exam_state = same education nodes + same state (highest priority), exam = same education nodes only" }),
  matchReason: z.string(),
  story: z.string().nullable().openapi({ description: "Story image URL if available and active (<24 hours old)" }),
}));

registry.registerPath({
  method: "get",
  path: "/matches",
  tags,
  security,
  summary: "Get pending matches",
  description: "Returns all pending matches for the current user.",
  responses: {
    200: {
      description: "Pending matches fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(matchSchema) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/matches/{id}",
  tags,
  security,
  summary: "Get match by ID",
  description: "Get full profile details of a specific match.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Match fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ match: matchSchema }) }) } },
    },
    404: {
      description: "Match not found",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/matches/refresh",
  tags,
  security,
  summary: "Refresh matches",
  description: "Generates a new batch of study partner recommendations. Algorithm priority: 1) Same education node(s) + same state (highest), 2) Same education node(s) only. Matching is mandatory — profiles with no shared education nodes are never included. Returns up to 10 matches.",
  responses: {
    200: {
      description: "Matches refreshed successfully or matching in progress.",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(matchSchema).optional() }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/matches/{id}/accept",
  tags,
  security,
  summary: "Accept match",
  description: "Update match status to accepted.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Match accepted successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }) }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/matches/{id}/reject",
  tags,
  security,
  summary: "Reject match",
  description: "Update match status to rejected.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Match rejected successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }) }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/matches/{id}/save",
  tags,
  security,
  summary: "Save match",
  description: "Update match status to saved.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Match saved successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/matches/saved",
  tags,
  security,
  summary: "Get saved matches",
  description: "Returns all saved matches for the current user.",
  responses: {
    200: {
      description: "Saved matches fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(matchSchema) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/matches/accepted",
  tags,
  security,
  summary: "Get accepted matches",
  description: "Returns all accepted matches for the current user.",
  responses: {
    200: {
      description: "Accepted matches fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(matchSchema) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/matches/mymatches",
  tags,
  security,
  summary: "Get all matches",
  description: "Alias for accepted matches. Returns all accepted matches for the current user.",
  responses: {
    200: {
      description: "All matches fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(matchSchema) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/matches/chats",
  tags,
  security,
  summary: "Get chat matches",
  description: "Alias for accepted matches. Returns all accepted matches for the chat view.",
  responses: {
    200: {
      description: "Chat matches fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(matchSchema) }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/matches/{id}",
  tags,
  security,
  summary: "Remove match",
  description: "Update match status to removed.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Match removed successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }) }) } },
    },
  },
});
