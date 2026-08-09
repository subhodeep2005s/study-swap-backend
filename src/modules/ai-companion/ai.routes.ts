import { Router } from "express";
import { aiController } from "./ai.controller";
import { sessionController } from "./session.controller";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { rateLimitMiddleware } from "@/core/middleware/rate-limit.middleware";
import "./ai.openapi"; // registers all AI Companion + Personal Session paths

const router = Router();

router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE & TASKS
// ─────────────────────────────────────────────────────────────────────────────

// Today's structured study plan (plan + stats + tasks)
router.get("/routines/today", aiController.getTodayRoutine);

// Manual task status override (no AI call needed)
router.post("/routines/tasks/:id/status", aiController.updateTaskStatus);

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONS & CHAT
// ─────────────────────────────────────────────────────────────────────────────

// List conversations (newest first)
router.get("/conversations", aiController.getConversations);

// Create a new conversation — rate limited to prevent spam
router.post("/conversations", rateLimitMiddleware(50, 3600, "ai_create"), aiController.createConversation);

// Delete conversation + cascade to all messages
router.delete("/conversations/:id", aiController.deleteConversation);

// Cursor-paginated message history
router.get("/conversations/:id/messages", aiController.getMessages);

// Send message → Gemini → AI reply (includes optional tool calls)
// Rate limited: 30 messages per 10 minutes
router.post(
  "/conversations/:id/messages",
  rateLimitMiddleware(30, 600, "ai_chat"),
  aiController.sendMessage
);

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL STUDY SESSIONS
// NOTE: These are solo, timer-based sessions for a single student.
//       They are COMPLETELY SEPARATE from the Communication module's
//       student↔student collaborative Focus Sessions (FocusService / LiveKit).
// ─────────────────────────────────────────────────────────────────────────────

// Restore: get currently active/paused session on app foreground
router.get("/sessions/active", sessionController.getActiveSession);

// List all sessions for a specific task
router.get("/sessions/task/:taskId", sessionController.getSessionsForTask);

// Get a single session by ID
router.get("/sessions/:id", sessionController.getSession);

// Start a new session (enforces one-active-per-user constraint)
router.post("/sessions/start", sessionController.startSession);

// Pause / resume / end
router.post("/sessions/:id/pause",  sessionController.pauseSession);
router.post("/sessions/:id/resume", sessionController.resumeSession);
router.post("/sessions/:id/end",    sessionController.endSession);

export const aiRoutes = router;
