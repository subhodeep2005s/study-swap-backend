import { z } from "zod";
import { registry } from "@/config/openapi";

// ─── Shared Zod schemas ───────────────────────────────────────────────────────

const zTask = z.object({
  id:              z.string().uuid(),
  plan_id:         z.string().uuid(),
  title:           z.string(),
  subject:         z.string().nullable(),
  duration:        z.number().describe("Planned duration in minutes"),
  actual_duration: z.number().nullable().describe("Total studied minutes from personal sessions"),
  start_time:      z.string().datetime().nullable(),
  status:          z.enum(["pending", "completed", "skipped", "rescheduled"]),
  priority:        z.enum(["low", "medium", "high"]),
  completed_at:    z.string().datetime().nullable(),
});

const zStudyPlan = z.object({
  id:              z.string().uuid(),
  user_id:         z.string().uuid(),
  date:            z.string().describe("YYYY-MM-DD"),
  status:          z.enum(["active", "completed", "cancelled"]),
  planned_minutes: z.number(),
  actual_minutes:  z.number(),
});

const zStats = z.object({
  total_tasks:       z.number(),
  completed_tasks:   z.number(),
  skipped_tasks:     z.number(),
  pending_tasks:     z.number(),
  rescheduled_tasks: z.number(),
});

const zConversation = z.object({
  id:         z.string().uuid(),
  user_id:    z.string().uuid(),
  title:      z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const zToolExecution = z.object({
  name:     z.string().describe("Tool name e.g. CREATE_STUDY_PLAN, GET_DAILY_PROGRESS"),
  response: z.record(z.string(), z.unknown()).describe("Tool output data"),
});

const zAIMessage = z.object({
  id:              z.string().uuid(),
  conversation_id: z.string().uuid(),
  role:            z.enum(["user", "model", "system"]),
  content:         z.string().nullable(),
  metadata:        z.array(zToolExecution).nullable().describe("Tool executions on model messages"),
  created_at:      z.string().datetime(),
});

const zSession = z.object({
  id:                  z.string().uuid(),
  task_id:             z.string().uuid(),
  user_id:             z.string().uuid(),
  status:              z.enum(["active", "paused", "completed", "abandoned"]),
  started_at:          z.string().datetime(),
  paused_at:           z.string().datetime().nullable(),
  ended_at:            z.string().datetime().nullable(),
  duration_seconds:    z.number().nullable().describe("Total studied seconds — written on end"),
  accumulated_seconds: z.number().describe("Running tally updated on pause; seed for client timer"),
  notes:               z.string().nullable(),
  created_at:          z.string().datetime(),
  updated_at:          z.string().datetime(),
});

const zSuccess  = z.object({ success: z.boolean() });
const zSuccessMsg = zSuccess.extend({ message: z.string() });

// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE & TASKS
// ─────────────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/ai/routines/today",
  tags: ["AI Companion — Routine"],
  summary: "Get today's adaptive study routine",
  description:
    "Returns the structured study plan for today — plan metadata, per-task details, " +
    "and aggregate stats. `plan` is `null` if the AI has not yet created a plan for today. " +
    "`actual_duration` on each task reflects total seconds accumulated from personal study sessions.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Today's routine",
      content: {
        "application/json": {
          schema: zSuccess.extend({
            data: z.object({
              plan:  zStudyPlan.nullable(),
              stats: zStats,
              tasks: z.array(zTask),
            }),
          }),
        },
      },
    },
    401: { description: "Authentication required" },
  },
});

registry.registerPath({
  method: "post",
  path: "/ai/routines/tasks/{id}/status",
  tags: ["AI Companion — Routine"],
  summary: "Manually update a task status (no AI interaction)",
  description:
    "Marks a task as completed, skipped, rescheduled, or resets to pending. " +
    "Updating to `completed` increments `study_plans.actual_minutes` by the task duration. " +
    "Reverting from `completed` decrements it.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid().describe("Task UUID") }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.enum(["completed", "skipped", "rescheduled", "pending"]),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Task updated",
      content: { "application/json": { schema: zSuccess.extend({ data: zTask }) } },
    },
    400: { description: "Invalid status value" },
    404: { description: "Task not found or not owned by caller" },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONS & CHAT
// ─────────────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/ai/conversations",
  tags: ["AI Companion — Chat"],
  summary: "List all AI conversations (newest first)",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Conversation list",
      content: { "application/json": { schema: zSuccess.extend({ data: z.array(zConversation) }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/ai/conversations",
  tags: ["AI Companion — Chat"],
  summary: "Create a new AI conversation",
  description: "**Rate limit:** 50 conversations / hour.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: z.object({ title: z.string().min(1) }) },
      },
    },
  },
  responses: {
    200: {
      description: "Conversation created",
      content: { "application/json": { schema: zSuccess.extend({ data: zConversation }) } },
    },
    429: { description: "Rate limit exceeded — 50/hour" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/ai/conversations/{id}",
  tags: ["AI Companion — Chat"],
  summary: "Delete a conversation and all its messages",
  description: "Hard delete — cascades to all `ai_messages` for this conversation.",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Conversation deleted",
      content: { "application/json": { schema: zSuccessMsg } },
    },
    404: { description: "Conversation not found or not owned by caller" },
  },
});

registry.registerPath({
  method: "get",
  path: "/ai/conversations/{id}/messages",
  tags: ["AI Companion — Chat"],
  summary: "Get message history for a conversation (cursor-paginated)",
  description:
    "Returns messages in reverse-chronological order for cursor pagination. " +
    "`cursor` is the `created_at` ISO timestamp of the oldest message in the last page. " +
    "Default page size: 20. `metadata` on model messages contains tool execution results.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({
      limit:  z.string().optional().describe("Page size (default 20, max 50)"),
      cursor: z.string().optional().describe("ISO timestamp cursor"),
    }),
  },
  responses: {
    200: {
      description: "Message page",
      content: { "application/json": { schema: zSuccess.extend({ data: z.array(zAIMessage) }) } },
    },
    404: { description: "Conversation not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/ai/conversations/{id}/messages",
  tags: ["AI Companion — Chat"],
  summary: "Send a message to the AI Companion and receive a reply",
  description:
    "Sends the user message to Google Gemini with the last 15 messages as context plus the student's " +
    "profile, exams, and today's progress. " +
    "The AI may invoke internal tools (`CREATE_STUDY_PLAN`, `GET_DAILY_PROGRESS`, `UPDATE_TASK_STATUS`) " +
    "before producing its final reply. All tool executions are included in `data.toolExecutions`. " +
    "Both user message and AI reply are persisted. " +
    "**Rate limit:** 30 messages / 10 minutes.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": { schema: z.object({ content: z.string().min(1) }) },
      },
    },
  },
  responses: {
    200: {
      description: "AI reply",
      content: {
        "application/json": {
          schema: zSuccess.extend({
            data: z.object({
              id:             z.string().uuid().describe("AI message ID"),
              content:        z.string().describe("AI text reply"),
              toolExecutions: z.array(zToolExecution),
            }),
          }),
        },
      },
    },
    404: { description: "Conversation not found" },
    429: { description: "Rate limit exceeded — 30/10min" },
    500: { description: "Gemini API unavailable — retry shortly" },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL STUDY SESSIONS
// NOTE: COMPLETELY SEPARATE from Communication module's student↔student
// collaborative Focus Sessions (FocusService / LiveKit). Solo, HTTP-only.
// ─────────────────────────────────────────────────────────────────────────────

const sessionParams = z.object({ id: z.string().uuid().describe("Session UUID") });

registry.registerPath({
  method: "post",
  path: "/ai/sessions/start",
  tags: ["AI Companion — Personal Sessions"],
  summary: "Start a personal study session for a task",
  description:
    "Starts a solo timer-based study session. " +
    "Constraints: task must belong to caller; only one active/paused session per user at a time (409); " +
    "only one active session per task at a time.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: z.object({ taskId: z.string().uuid() }) },
      },
    },
  },
  responses: {
    201: {
      description: "Session started",
      content: { "application/json": { schema: zSuccess.extend({ data: zSession }) } },
    },
    400: { description: "Missing taskId" },
    404: { description: "Task not found or not owned by caller" },
    409: { description: "User already has an active/paused session — end it first" },
  },
});

registry.registerPath({
  method: "post",
  path: "/ai/sessions/{id}/pause",
  tags: ["AI Companion — Personal Sessions"],
  summary: "Pause an active study session",
  description:
    "Accumulates elapsed seconds since `started_at` into `accumulated_seconds` and sets `paused_at`.",
  security: [{ bearerAuth: [] }],
  request: { params: sessionParams },
  responses: {
    200: {
      description: "Session paused",
      content: { "application/json": { schema: zSuccess.extend({ data: zSession }) } },
    },
    400: { description: "Session is not active" },
    404: { description: "Session not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/ai/sessions/{id}/resume",
  tags: ["AI Companion — Personal Sessions"],
  summary: "Resume a paused study session",
  description:
    "Resets `started_at` to NOW() so the next pause/end calculates only new elapsed time. " +
    "`accumulated_seconds` preserves previous segments.",
  security: [{ bearerAuth: [] }],
  request: { params: sessionParams },
  responses: {
    200: {
      description: "Session resumed",
      content: { "application/json": { schema: zSuccess.extend({ data: zSession }) } },
    },
    400: { description: "Session is not paused" },
    404: { description: "Session not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/ai/sessions/{id}/end",
  tags: ["AI Companion — Personal Sessions"],
  summary: "End a study session (completed or abandoned)",
  description:
    "Finalises session: computes `duration_seconds`, writes `study_tasks.actual_duration` " +
    "= SUM of all completed sessions for that task. Idempotent if already ended.",
  security: [{ bearerAuth: [] }],
  request: {
    params: sessionParams,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            outcome: z.enum(["completed", "abandoned"]),
            notes:   z.string().max(2000).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Session ended — task actual_duration updated",
      content: { "application/json": { schema: zSuccess.extend({ data: zSession }) } },
    },
    400: { description: "Invalid outcome" },
    404: { description: "Session not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/ai/sessions/active",
  tags: ["AI Companion — Personal Sessions"],
  summary: "Get the caller's currently active or paused session",
  description:
    "Used by the Expo app on foreground restore to re-seed the local timer. " +
    "Returns `null` if no session is running. " +
    "Client computes elapsed = `accumulated_seconds` + seconds since `started_at` (if active).",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Active session or null",
      content: {
        "application/json": {
          schema: zSuccess.extend({ data: zSession.nullable() }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/ai/sessions/task/{taskId}",
  tags: ["AI Companion — Personal Sessions"],
  summary: "List all sessions for a task (any status, newest first)",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ taskId: z.string().uuid() }) },
  responses: {
    200: {
      description: "Session history for task",
      content: { "application/json": { schema: zSuccess.extend({ data: z.array(zSession) }) } },
    },
    404: { description: "Task not found or not owned by caller" },
  },
});

registry.registerPath({
  method: "get",
  path: "/ai/sessions/{id}",
  tags: ["AI Companion — Personal Sessions"],
  summary: "Get a single session by ID",
  security: [{ bearerAuth: [] }],
  request: { params: sessionParams },
  responses: {
    200: {
      description: "Session detail",
      content: { "application/json": { schema: zSuccess.extend({ data: zSession }) } },
    },
    404: { description: "Session not found" },
  },
});
