import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as mentorsService from "./mentors.service";

export const getMentors = asyncHandler(async (req: Request<{}, any, any, { cursor?: string }>, res: Response) => {
  const { cursor } = req.query;
  const result = await mentorsService.getMentors(cursor);
  res.status(200).json({ success: true, message: "Mentors fetched successfully", data: result });
});

export const getMentorsByMyEducationNodes = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const mentors = await mentorsService.getMentorsByMyEducationNodes(userId);
  res.status(200).json({ success: true, message: "Mentors fetched successfully", data: mentors });
});

export const getMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const mentor = await mentorsService.getMentor(req.params.id);
  res.status(200).json({ success: true, message: "Mentor fetched successfully", data: mentor });
});

export const getMentorPlans = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const plans = await mentorsService.getMentorPlans(req.params.id);
  res.status(200).json({ success: true, message: "Mentor plans fetched successfully", data: plans });
});

export const getMentorSlots = asyncHandler(async (req: Request<{ id: string }, any, any, { planId: string, date: string }>, res: Response) => {
  const { planId, date } = req.query;
  const slots = await mentorsService.getMentorSlots(req.params.id, planId, date);
  res.status(200).json({ success: true, message: "Mentor slots fetched", data: slots });
});

export const bookSession = asyncHandler(async (req: Request, res: Response) => {
  const { mentorId, planId, slotId } = req.body;
  const result = await mentorsService.bookSession(req.user!.id, mentorId, planId, slotId);
  res.status(201).json({ success: true, message: "Session booked successfully", data: result });
});

export const getStudentBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await mentorsService.getStudentBookings(req.user!.id);
  res.status(200).json({ success: true, message: "Bookings fetched successfully", data: bookings });
});

export const getStudentBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const booking = await mentorsService.getStudentBooking(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Booking fetched successfully", data: booking });
});

export const cancelBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await mentorsService.cancelBooking(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: "Booking cancelled successfully", data: {} });
});
