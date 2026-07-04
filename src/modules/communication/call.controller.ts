import type { Request, Response } from "express";
import { CallService } from "./call.service";

export class CallController {
  static async startCall(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const { conversationId, type } = req.body as any;

    const call = await CallService.startCall(userId, conversationId, type);
    res.status(201).json({ success: true, data: call });
  }

  static async acceptCall(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const callId = req.params.callId as string;
    const participantName = req.user!.email?.split('@')[0] || 'User';

    const credentials = await CallService.acceptCall(userId, callId, participantName);
    res.json({ success: true, data: credentials });
  }

  static async endCall(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const callId = req.params.callId as string;

    const call = await CallService.endCall(userId, callId);
    res.json({ success: true, data: call });
  }

  static async getCallHistory(req: Request, res: Response) {
    const userId = req.user!.id as string;
    const conversationId = req.params.conversationId as string;
    const cursor = req.query.cursor as string | undefined;

    const history = await CallService.getCallHistory(userId, conversationId, cursor);
    res.json({ success: true, data: history });
  }
}
