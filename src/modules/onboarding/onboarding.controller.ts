import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as onboardingService from "./onboarding.service";
import type { CountryInput, ProfileInput, ExamsInput, StudyInput, PreferencesInput, EnhanceBioInput, MentorApplicationInput } from "./onboarding.schema";

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = await onboardingService.getStatus(req.user!.id);
  res.status(200).json({ success: true, message: "Status fetched successfully", data });
});

export const saveCountry = asyncHandler(async (req: Request<unknown, unknown, CountryInput>, res: Response) => {
  await onboardingService.saveCountry(req.user!.id, req.body);
  res.status(200).json({ success: true, message: "Country saved successfully", data: {} });
});

export const updateProfile = asyncHandler(async (req: Request<unknown, unknown, ProfileInput>, res: Response) => {
  await onboardingService.updateProfile(req.user!.id, req.body);
  res.status(200).json({ success: true, message: "Profile updated successfully", data: {} });
});

export const getExams = asyncHandler(async (req: Request, res: Response) => {
  const data = await onboardingService.getExams(req.user!.id);
  res.status(200).json({ success: true, message: "Exams fetched successfully", data: { exams: data } });
});

export const saveExams = asyncHandler(async (req: Request<unknown, unknown, ExamsInput>, res: Response) => {
  await onboardingService.saveExams(req.user!.id, req.body);
  res.status(200).json({ success: true, message: "Exams saved successfully", data: {} });
});

export const saveStudyDetails = asyncHandler(async (req: Request<unknown, unknown, StudyInput>, res: Response) => {
  await onboardingService.saveStudyDetails(req.user!.id, req.body);
  res.status(200).json({ success: true, message: "Study details saved successfully", data: {} });
});

export const savePreferences = asyncHandler(async (req: Request<unknown, unknown, PreferencesInput>, res: Response) => {
  await onboardingService.savePreferences(req.user!.id, req.body);
  res.status(200).json({ success: true, message: "Preferences saved successfully", data: {} });
});

export const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
  await onboardingService.completeOnboarding(req.user!.id, req.user!.email);
  res.status(200).json({ success: true, message: "Onboarding completed successfully", data: {} });
});

export const enhanceBio = asyncHandler(async (req: Request<unknown, unknown, EnhanceBioInput>, res: Response) => {
  const enhancedBio = await onboardingService.enhanceBio(req.body.bio);
  res.status(200).json({ success: true, message: "Bio enhanced successfully.", data: { bio: enhancedBio } });
});

export const applyForMentor = asyncHandler(async (req: Request<unknown, unknown, MentorApplicationInput>, res: Response) => {
  await onboardingService.applyForMentor(req.user!.id, req.body);
  res.status(200).json({ success: true, message: "Mentor application submitted successfully", data: {} });
});
