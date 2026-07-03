import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as service from "./mentors.service";

export const getMentors = asyncHandler(async (req: Request, res: Response) => {
  const mentors = await service.getMentors();
  res.status(200).json({ success: true, message: "Mentors fetched", data: mentors });
});

export const getMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const mentor = await service.getMentor(req.params.id);
  res.status(200).json({ success: true, message: "Mentor fetched", data: mentor });
});

export const updateMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const mentor = await service.updateMentor(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Mentor updated", data: mentor });
});

export const deleteMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await service.deleteMentor(req.params.id);
  res.status(200).json({ success: true, message: "Mentor deleted", data: {} });
});

export const verifyMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const mentor = await service.verifyMentor(req.params.id);
  res.status(200).json({ success: true, message: "Mentor verified", data: mentor });
});

export const getBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await service.getBookings();
  res.status(200).json({ success: true, message: "Bookings fetched", data: bookings });
});

export const getBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const booking = await service.getBooking(req.params.id);
  res.status(200).json({ success: true, message: "Booking fetched", data: booking });
});

export const updateBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const booking = await service.updateBooking(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Booking updated", data: booking });
});

export const deleteBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await service.deleteBooking(req.params.id);
  res.status(200).json({ success: true, message: "Booking deleted", data: {} });
});
