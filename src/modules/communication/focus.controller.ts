import type { Request, Response } from "express";
import { FocusService } from "./focus.service";

export class FocusController {
  static async startFocus(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const { conversationId, durationSeconds } = req.body as any;

    const focus = await FocusService.startFocus(userId, conversationId, durationSeconds);
    res.status(201).json({ success: true, data: focus });
  }

  static async acceptFocus(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const focusId = req.params.focusId as string;
    const participantName = req.user!.email?.split('@')[0] || 'User';

    const credentials = await FocusService.acceptFocus(userId, focusId, participantName);
    res.json({ success: true, data: credentials });
  }

  static async endFocus(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const focusId = req.params.focusId as string;

    const focus = await FocusService.endFocus(userId, focusId);
    res.json({ success: true, data: focus });
  }

  static async getFocusHistory(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const conversationId = req.params.conversationId as string;
    const cursor = req.query.cursor as string | undefined;

    const history = await FocusService.getFocusHistory(userId, conversationId, cursor);
    res.json({ success: true, data: history });
  }
}
