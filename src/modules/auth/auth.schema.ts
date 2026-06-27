import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.email("Invalid email format"),
    otp: z.string().min(1, "OTP is required"),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.email("Invalid email format"),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type AdminLoginInput = z.infer<typeof adminLoginSchema>["body"];
