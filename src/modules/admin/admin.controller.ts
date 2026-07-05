import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as adminService from "./admin.service";
import type { AdminLoginInput, CreateCountryInput, UpdateCountryInput, CreateExamInput, UpdateExamInput } from "./admin.schema";

// =========================================================================
// Auth
// =========================================================================
export const login = asyncHandler(async (req: Request<unknown, unknown, AdminLoginInput>, res: Response) => {
  const data = await adminService.login(req.body);
  res.status(200).json({ success: true, message: "Admin login successful", data });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "Admin details fetched", data: { user: req.user } });
});

// =========================================================================
// Dashboard
// =========================================================================
export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getDashboard();
  res.status(200).json({ success: true, message: "Dashboard data fetched", data });
});

// =========================================================================
// Countries
// =========================================================================
export const getCountries = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as any;
  const data = await adminService.getCountries({ page: Number(page) || 1, limit: Number(limit) || 20, search });
  res.status(200).json({ success: true, message: "Countries fetched", ...data });
});

export const createCountry = asyncHandler(async (req: Request<unknown, unknown, CreateCountryInput>, res: Response) => {
  const data = await adminService.createCountry(req.body);
  res.status(201).json({ success: true, message: "Country created", data: { country: data } });
});

export const updateCountry = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateCountryInput>, res: Response) => {
  const data = await adminService.updateCountry(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Country updated", data: { country: data } });
});

export const deleteCountry = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deleteCountry(req.params.id);
  res.status(200).json({ success: true, message: "Country deleted", data: {} });
});

// =========================================================================
// Exams
// =========================================================================
export const getExams = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as any;
  const data = await adminService.getExams({ page: Number(page) || 1, limit: Number(limit) || 20, search });
  res.status(200).json({ success: true, message: "Exams fetched", ...data });
});

export const getExamsByCountry = asyncHandler(async (req: Request<{ countryId: string }>, res: Response) => {
  const data = await adminService.getExamsByCountry(req.params.countryId);
  res.status(200).json({ success: true, message: "Exams fetched", data: { exams: data } });
});

export const createExam = asyncHandler(async (req: Request<unknown, unknown, CreateExamInput>, res: Response) => {
  const data = await adminService.createExam(req.body);
  res.status(201).json({ success: true, message: "Exam created", data: { exam: data } });
});

export const updateExam = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateExamInput>, res: Response) => {
  const data = await adminService.updateExam(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Exam updated", data: { exam: data } });
});

export const deleteExam = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deleteExam(req.params.id);
  res.status(200).json({ success: true, message: "Exam deleted", data: {} });
});

// =========================================================================
// Users
// =========================================================================
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as any;
  const data = await adminService.getUsers({ page: Number(page) || 1, limit: Number(limit) || 20, search });
  res.status(200).json({ success: true, message: "Users fetched", ...data });
});

export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as any;
  const data = await adminService.getStudents({ page: Number(page) || 1, limit: Number(limit) || 20, search });
  res.status(200).json({ success: true, message: "Students fetched", ...data });
});

export const getMentorsUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as any;
  const data = await adminService.getMentorsUsers({ page: Number(page) || 1, limit: Number(limit) || 20, search });
  res.status(200).json({ success: true, message: "Mentors fetched", ...data });
});

export const getUserById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const data = await adminService.getUserById(req.params.id);
  res.status(200).json({ success: true, message: "User fetched", data: { user: data } });
});

export const updateStudent = asyncHandler(async (req: Request<{ id: string }, unknown, any>, res: Response) => {
  const data = await adminService.updateStudent(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Student updated", data: { user: data } });
});

export const updateMentorUser = asyncHandler(async (req: Request<{ id: string }, unknown, any>, res: Response) => {
  const data = await adminService.updateMentorUser(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Mentor updated", data: { user: data } });
});

export const deleteUser = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deleteUser(req.params.id);
  res.status(200).json({ success: true, message: "User deleted", data: {} });
});

// =========================================================================
// Matches
// =========================================================================
export const getMatches = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as any;
  const data = await adminService.getMatches({ page: Number(page) || 1, limit: Number(limit) || 20 });
  res.status(200).json({ success: true, message: "Matches fetched", ...data });
});

export const getMatchesByUser = asyncHandler(async (req: Request<{ userId: string }>, res: Response) => {
  const data = await adminService.getMatchesByUser(req.params.userId);
  res.status(200).json({ success: true, message: "User matches fetched", data: { matches: data } });
});

export const deleteMatch = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deleteMatch(req.params.id);
  res.status(200).json({ success: true, message: "Match deleted", data: {} });
});

// =========================================================================
// Audit Logs
// =========================================================================
export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, userId, action, from, to } = req.query as any;
  const data = await adminService.getAuditLogs({
    page: Number(page) || 1,
    limit: Number(limit) || 50,
    userId,
    action,
    from,
    to,
  });
  res.status(200).json({ success: true, message: "Audit logs fetched", ...data });
});

// =========================================================================
// Mentors (Merged)
// =========================================================================
export const getMentors = asyncHandler(async (req: Request, res: Response) => {
  const mentors = await adminService.getMentors();
  res.status(200).json({ success: true, message: "Mentors fetched", data: mentors });
});

export const getMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const mentor = await adminService.getMentor(req.params.id);
  res.status(200).json({ success: true, message: "Mentor fetched", data: mentor });
});

export const updateMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const mentor = await adminService.updateMentor(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Mentor updated", data: mentor });
});

export const deleteMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deleteMentor(req.params.id);
  res.status(200).json({ success: true, message: "Mentor deleted", data: {} });
});

export const verifyMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const mentor = await adminService.verifyMentor(req.params.id);
  res.status(200).json({ success: true, message: "Mentor verified", data: mentor });
});

// =========================================================================
// Bookings (Merged)
// =========================================================================
export const getBookings = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, status } = req.query as any;
  const data = await adminService.getBookings({
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    search,
    status,
  });
  res.status(200).json({ success: true, message: "Bookings fetched", ...data });
});

export const getBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const booking = await adminService.getBooking(req.params.id);
  res.status(200).json({ success: true, message: "Booking fetched", data: booking });
});

export const getBookingsByMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const bookings = await adminService.getBookingsByMentor(req.params.id);
  res.status(200).json({ success: true, message: "Mentor bookings fetched", data: { bookings } });
});

export const updateBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const booking = await adminService.updateBooking(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Booking updated", data: booking });
});

export const deleteBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deleteBooking(req.params.id);
  res.status(200).json({ success: true, message: "Booking deleted", data: {} });
});

export const regenerateMeetLink = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const result = await adminService.regenerateMeetLink(req.params.id);
  res.status(200).json({ success: true, message: "Google Meet link regenerated", data: result });
});

// =========================================================================
// Slots (Merged)
// =========================================================================
export const getMentorSlots = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const slots = await adminService.getMentorSlots(req.params.id);
  res.status(200).json({ success: true, message: "Mentor slots fetched", data: { slots } });
});

export const deleteSlot = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deleteSlot(req.params.id);
  res.status(200).json({ success: true, message: "Slot deleted", data: {} });
});

// =========================================================================
// Plans (Merged)
// =========================================================================
export const getMentorPlans = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const plans = await adminService.getMentorPlans(req.params.id);
  res.status(200).json({ success: true, message: "Mentor plans fetched", data: { plans } });
});

export const updatePlan = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const plan = await adminService.updatePlan(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Plan updated", data: plan });
});

export const deletePlan = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deletePlan(req.params.id);
  res.status(200).json({ success: true, message: "Plan deleted", data: {} });
});
