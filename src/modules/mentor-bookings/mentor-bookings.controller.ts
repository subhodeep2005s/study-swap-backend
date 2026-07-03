import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as service from "./mentor-bookings.service";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await service.getMentorProfile(req.user!.id);
  res.status(200).json({ success: true, message: "Profile fetched", data: profile });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await service.updateMentorProfile(req.user!.id, req.body);
  res.status(200).json({ success: true, message: "Profile updated", data: profile });
});

export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const plans = await service.getPlans(req.user!.id);
  res.status(200).json({ success: true, message: "Plans fetched", data: plans });
});

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await service.createPlan(req.user!.id, req.body);
  res.status(201).json({ success: true, message: "Plan created", data: plan });
});

export const updatePlan = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const plan = await service.updatePlan(req.user!.id, req.params.id, req.body);
  res.status(200).json({ success: true, message: "Plan updated", data: plan });
});

export const deletePlan = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await service.deletePlan(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Plan deleted", data: {} });
});

export const getSlots = asyncHandler(async (req: Request, res: Response) => {
  const slots = await service.getSlots(req.user!.id);
  res.status(200).json({ success: true, message: "Slots fetched", data: slots });
});

export const createSlot = asyncHandler(async (req: Request, res: Response) => {
  const slot = await service.createSlot(req.user!.id, req.body);
  res.status(201).json({ success: true, message: "Slot created", data: slot });
});

export const updateSlot = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const slot = await service.updateSlot(req.user!.id, req.params.id, req.body);
  res.status(200).json({ success: true, message: "Slot updated", data: slot });
});

export const deleteSlot = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await service.deleteSlot(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Slot deleted", data: {} });
});

export const getBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await service.getBookings(req.user!.id);
  res.status(200).json({ success: true, message: "Bookings fetched", data: bookings });
});

export const getBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const booking = await service.getBooking(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Booking fetched", data: booking });
});

export const confirmBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const booking = await service.confirmBooking(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Booking confirmed", data: booking });
});

export const completeBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const booking = await service.completeBooking(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Booking completed", data: booking });
});

export const cancelBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await service.cancelMentorBooking(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Booking cancelled", data: {} });
});
