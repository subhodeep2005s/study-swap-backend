import { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import { AppError } from "@/core/errors/AppError";
import { SessionRepository } from "./session.repository";

export const sessionController = {
  /**
   * POST /ai/sessions/start
   * Body: { taskId: string }
   *
   * Starts a new personal study session for the given task.
   * The task must belong to the authenticated user.
   * The user must not already have an active/paused session.
   */
  startSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { taskId } = req.body;

    if (!taskId) throw new AppError("taskId is required", 400);

    const session = await SessionRepository.startSession(taskId, userId);

    res.status(201).json({
      success: true,
      message: "Study session started",
      data: session
    });
  }),

  /**
   * POST /ai/sessions/:id/pause
   *
   * Pauses the active session. Accumulates elapsed time.
   */
  pauseSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;

    const session = await SessionRepository.pauseSession(sessionId, userId);

    res.json({
      success: true,
      message: "Session paused",
      data: session
    });
  }),

  /**
   * POST /ai/sessions/:id/resume
   *
   * Resumes a paused session.
   */
  resumeSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;

    const session = await SessionRepository.resumeSession(sessionId, userId);

    res.json({
      success: true,
      message: "Session resumed",
      data: session
    });
  }),

  /**
   * POST /ai/sessions/:id/end
   * Body: { outcome: "completed" | "abandoned", notes?: string }
   *
   * Ends the session, records duration_seconds, and updates the task's actual_duration.
   */
  endSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const { outcome, notes } = req.body;

    if (!outcome || !["completed", "abandoned"].includes(outcome)) {
      throw new AppError("outcome must be 'completed' or 'abandoned'", 400);
    }

    const session = await SessionRepository.endSession(sessionId, userId, outcome, notes);

    res.json({
      success: true,
      message: `Session ${outcome}`,
      data: session
    });
  }),

  /**
   * GET /ai/sessions/task/:taskId
   *
   * Lists all sessions for a given task (owned by the user).
   */
  getSessionsForTask: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const taskId = req.params.taskId as string;

    // Verify ownership
    await SessionRepository.verifyTaskOwnership(taskId, userId);

    const sessions = await SessionRepository.getSessionsForTask(taskId, userId);

    res.json({
      success: true,
      data: sessions
    });
  }),

  /**
   * GET /ai/sessions/active
   *
   * Returns the currently active or paused session for the user, if any.
   * Used by the frontend to restore a session after app background/foreground.
   */
  getActiveSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const session = await SessionRepository.getActiveSessionForUser(userId);

    res.json({
      success: true,
      data: session || null
    });
  }),

  /**
   * GET /ai/sessions/:id
   *
   * Get a single session by ID.
   */
  getSession: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const session = await SessionRepository.getSessionById(req.params.id as string, userId);

    res.json({
      success: true,
      data: session
    });
  })
};
