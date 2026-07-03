import { z } from "zod";

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const createCountrySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    flag: z.string().nullable().optional(),
    isoCode: z.string().length(2, "ISO Code must be exactly 2 characters").toUpperCase().optional(),
  }),
});

export const updateCountrySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    flag: z.string().nullable().optional(),
    isoCode: z.string().length(2).toUpperCase().optional(),
  }),
});

export const createExamSchema = z.object({
  body: z.object({
    countryId: z.string().uuid("Invalid country ID"),
    name: z.string().min(1, "Name is required"),
    isActive: z.boolean().optional(),
  }),
});

export const updateExamSchema = z.object({
  body: z.object({
    countryId: z.string().uuid("Invalid country ID").optional(),
    name: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateStudentSchema = z.object({
  body: z.object({
    role: z.enum(["student", "mentor"]).optional(),
    emailVerified: z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
    // Profile details
    fullName: z.string().optional(),
    profileImage: z.string().optional(),
    age: z.number().optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    state: z.string().optional(),
    countryId: z.string().uuid().nullable().optional(),
    bio: z.string().optional(),
    strongIn: z.string().optional(),
    needHelpWith: z.string().optional(),
    studyTime: z.enum(["morning", "afternoon", "evening", "late_night"]).optional(),
    lookingFor: z.array(z.string()).optional(),
  }),
});

export const updateMentorUserSchema = updateStudentSchema.extend({
  body: updateStudentSchema.shape.body.extend({
    // Mentor details
    title: z.string().optional(),
    qualification: z.string().optional(),
    experienceYears: z.number().optional(),
    hourlyPrice: z.number().optional(),
    isVerified: z.boolean().optional(),
  }),
});

export const adminUserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
  email_verified: z.boolean(),
  onboarding_completed: z.boolean(),
  created_at: z.string().or(z.date()),
  full_name: z.string().nullable().optional(),
  profile_image: z.string().nullable().optional(),
  country_id: z.string().uuid().nullable().optional(),
  state: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  bio: z.string().nullable().optional(),
  strong_in: z.string().nullable().optional(),
  need_help_with: z.string().nullable().optional(),
  study_time: z.string().nullable().optional(),
  looking_for: z.array(z.string()).nullable().optional(),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>["body"];
export type CreateCountryInput = z.infer<typeof createCountrySchema>["body"];
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>["body"];
export type CreateExamInput = z.infer<typeof createExamSchema>["body"];
export type UpdateExamInput = z.infer<typeof updateExamSchema>["body"];
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>["body"];
export type UpdateMentorUserInput = z.infer<typeof updateMentorUserSchema>["body"];
