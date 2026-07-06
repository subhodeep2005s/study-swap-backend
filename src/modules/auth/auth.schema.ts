import { z } from "zod";

export const sendOtpSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").toLowerCase(),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").toLowerCase(),
    otp: z.string().length(6, "OTP must be 6 digits"),
    role: z.enum(["student", "mentor"]).optional(),
  }),
});

export const updateNotificationTokenSchema = z.object({
  body: z.object({
    notificationToken: z.string().min(1, "Notification token is required"),
  }),
});

export const authUserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
  emailVerified: z.boolean(),
  onboardingCompleted: z.boolean(),
  createdAt: z.string(),
  fullName: z.string().nullable().optional(),
  profileImage: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  gender: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  countryId: z.string().uuid().nullable().optional(),
  bio: z.string().nullable().optional(),
  strongIn: z.string().nullable().optional(),
  needHelpWith: z.string().nullable().optional(),
  studyTime: z.string().nullable().optional(),
  lookingFor: z.array(z.string()).nullable().optional(),
  exams: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
  })).optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>["body"];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>["body"];
export type UpdateNotificationTokenInput = z.infer<typeof updateNotificationTokenSchema>["body"];
