import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as adminService from "./admin.service";
import type { AdminLoginInput, CreateCountryInput, UpdateCountryInput, CreateExamInput, UpdateExamInput } from "./admin.schema";

export const login = asyncHandler(async (req: Request<unknown, unknown, AdminLoginInput>, res: Response) => {
  const data = await adminService.login(req.body);
  res.status(200).json({ success: true, message: "Admin login successful", data });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "Admin details fetched", data: { user: req.user } });
});

export const getCountries = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getCountries();
  res.status(200).json({ success: true, message: "Countries fetched", data: { countries: data } });
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

export const getExams = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getExams();
  res.status(200).json({ success: true, message: "Exams fetched", data: { exams: data } });
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

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getUsers();
  res.status(200).json({ success: true, message: "Users fetched", data: { users: data } });
});

export const getStudents = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getStudents();
  res.status(200).json({ success: true, message: "Students fetched", data: { users: data } });
});

export const getMentorsUsers = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getMentorsUsers();
  res.status(200).json({ success: true, message: "Mentors fetched", data: { users: data } });
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
