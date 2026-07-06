import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as matchesService from "./matches.service";

export const getPendingMatches = asyncHandler(async (req: Request, res: Response) => {
  const matches = await matchesService.getPendingMatches(req.user!.id);
  res.status(200).json({ success: true, message: "Pending matches fetched", data: matches });
});

export const getMatchById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const match = await matchesService.getMatch(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Match fetched successfully", data: match });
});

export const refreshMatches = asyncHandler(async (req: Request, res: Response) => {
  const result = await matchesService.refreshMatches(req.user!.id);
  if ("message" in result && !Array.isArray(result)) {
    // This handles the Redis lock early return
    return res.status(200).json(result);
  }
  res.status(200).json({ success: true, message: "Matches refreshed successfully", data: result });
});

export const acceptMatch = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await matchesService.acceptMatch(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Match accepted successfully", data: {} });
});

export const rejectMatch = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await matchesService.rejectMatch(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Match rejected successfully", data: {} });
});

export const saveMatch = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await matchesService.saveMatch(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Match saved successfully", data: {} });
});

export const getSavedMatches = asyncHandler(async (req: Request, res: Response) => {
  const matches = await matchesService.getSavedMatches(req.user!.id);
  res.status(200).json({ success: true, message: "Saved matches fetched", data: matches });
});

export const getAcceptedMatches = asyncHandler(async (req: Request, res: Response) => {
  const matches = await matchesService.getAcceptedMatches(req.user!.id);
  res.status(200).json({ success: true, message: "Accepted matches fetched", data: matches });
});

export const removeMatch = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await matchesService.removeMatch(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Match removed successfully", data: {} });
});
