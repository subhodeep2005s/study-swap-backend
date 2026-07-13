import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as adminService from "./admin.service";
import type { AdminLoginInput, CreateCountryInput, UpdateCountryInput, CreateEducationNodeInput, UpdateEducationNodeInput } from "./admin.schema";

// =========================================================================
// Auth
// =========================================================================
export const login = asyncHandler(async (req: Request<unknown, unknown, AdminLoginInput>, res: Response) => {
  const data = await adminService.login(req.body);
  res.status(200).json({ success: true, message: "Admin login successful", data });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "Admin details fetched", data: req.user });
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
  const result = await adminService.getCountries({ page: Number(page) || 1, limit: Number(limit) || 20, search });
  res.status(200).json({ success: true, message: "Countries fetched successfully", data: result.data, pagination: result.pagination });
});

export const createCountry = asyncHandler(async (req: Request<unknown, unknown, CreateCountryInput>, res: Response) => {
  const data = await adminService.createCountry(req.body);
  res.status(201).json({ success: true, message: "Country created", data });
});

export const updateCountry = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateCountryInput>, res: Response) => {
  const data = await adminService.updateCountry(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Country updated", data });
});

export const deleteCountry = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deleteCountry(req.params.id);
  res.status(200).json({ success: true, message: "Country deleted", data: {} });
});

// =========================================================================
// Education Nodes
// =========================================================================
export const getEducationNodes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, parentId, type } = req.query as any;
  const result = await adminService.getEducationNodes({ 
    page: Number(page) || 1, 
    limit: Number(limit) || 20, 
    search, 
    parentId, 
    type 
  });
  res.status(200).json({ success: true, message: "Education nodes fetched successfully", data: result.data, pagination: result.pagination });
});

export const getEducationNodesByCountry = asyncHandler(async (req: Request<{ countryId: string }>, res: Response) => {
  const data = await adminService.getEducationNodesByCountry(req.params.countryId);
  res.status(200).json({ success: true, message: "Education nodes fetched", data });
});

export const createEducationNode = asyncHandler(async (req: Request<unknown, unknown, CreateEducationNodeInput>, res: Response) => {
  const data = await adminService.createEducationNode(req.body);
  res.status(201).json({ success: true, message: "Education node created", data });
});

export const updateEducationNode = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateEducationNodeInput>, res: Response) => {
  const data = await adminService.updateEducationNode(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Education node updated", data });
});

export const deleteEducationNode = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deleteEducationNode(req.params.id);
  res.status(200).json({ success: true, message: "Education node deleted", data: {} });
});

// =========================================================================
// Users
// =========================================================================
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as any;
  const result = await adminService.getUsers({ page: Number(page) || 1, limit: Number(limit) || 20, search });
  res.status(200).json({ success: true, message: "Users fetched successfully", data: result.data, pagination: result.pagination });
});

export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as any;
  const result = await adminService.getStudents({ page: Number(page) || 1, limit: Number(limit) || 20, search });
  res.status(200).json({ success: true, message: "Students fetched successfully", data: result.data, pagination: result.pagination });
});

export const getMentorsUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, isVerified } = req.query as any;
  const isVerifiedBool = isVerified === 'true' ? true : isVerified === 'false' ? false : undefined;
  const result = await adminService.getMentorsUsers({ page: Number(page) || 1, limit: Number(limit) || 20, search, isVerified: isVerifiedBool });
  res.status(200).json({ success: true, message: "Mentors fetched successfully", data: result.data, pagination: result.pagination });
});

export const getUserById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const data = await adminService.getUserById(req.params.id);
  res.status(200).json({ success: true, message: "User fetched", data });
});

export const updateStudent = asyncHandler(async (req: Request<{ id: string }, unknown, any>, res: Response) => {
  const data = await adminService.updateStudent(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Student updated", data });
});

export const updateMentorUser = asyncHandler(async (req: Request<{ id: string }, unknown, any>, res: Response) => {
  const data = await adminService.updateMentorUser(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Mentor updated", data });
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
  const result = await adminService.getMatches({ page: Number(page) || 1, limit: Number(limit) || 20 });
  res.status(200).json({ success: true, message: "Matches fetched successfully", data: result.data, pagination: result.pagination });
});

export const getMatchesByUser = asyncHandler(async (req: Request<{ userId: string }>, res: Response) => {
  const data = await adminService.getMatchesByUser(req.params.userId);
  res.status(200).json({ success: true, message: "User matches fetched", data });
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
  const result = await adminService.getAuditLogs({
    page: Number(page) || 1,
    limit: Number(limit) || 50,
    userId,
    action,
    from,
    to,
  });
  res.status(200).json({ success: true, message: "Audit logs fetched successfully", data: result.data, pagination: result.pagination });
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
  const result = await adminService.getBookings({
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    search,
    status,
  });
  res.status(200).json({ success: true, message: "Bookings fetched successfully", data: result.data, pagination: result.pagination });
});

export const getBooking = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const booking = await adminService.getBooking(req.params.id);
  res.status(200).json({ success: true, message: "Booking fetched", data: booking });
});

export const getBookingsByMentor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const bookings = await adminService.getBookingsByMentor(req.params.id);
  res.status(200).json({ success: true, message: "Mentor bookings fetched", data: bookings });
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
// Availability (Merged)
// =========================================================================
export const getMentorAvailability = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const availability = await adminService.getMentorAvailability(req.params.id);
  res.status(200).json({ success: true, message: "Mentor availability fetched", data: availability });
});

export const updateMentorAvailability = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const availability = await adminService.updateMentorAvailability(req.params.id, req.body.availability);
  res.status(200).json({ success: true, message: "Mentor availability updated", data: availability });
});

// =========================================================================
// Plans (Merged)
// =========================================================================
export const getMentorPlans = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const plans = await adminService.getMentorPlans(req.params.id);
  res.status(200).json({ success: true, message: "Mentor plans fetched", data: plans });
});

export const updatePlan = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const plan = await adminService.updatePlan(req.params.id, req.body);
  res.status(200).json({ success: true, message: "Plan updated", data: plan });
});

export const deletePlan = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await adminService.deletePlan(req.params.id);
  res.status(200).json({ success: true, message: "Plan deleted", data: {} });
});
