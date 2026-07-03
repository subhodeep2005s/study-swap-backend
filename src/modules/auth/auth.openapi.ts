import { registry } from "@/config/openapi";
import { z } from "zod";
import { sendOtpSchema, verifyOtpSchema, authUserResponseSchema } from "./auth.schema";

const SendOtpInput = registry.register("SendOtpInput", sendOtpSchema.shape.body);
const VerifyOtpInput = registry.register("VerifyOtpInput", verifyOtpSchema.shape.body);
const AuthUserResponse = registry.register("AuthUserResponse", authUserResponseSchema);

registry.registerPath({
  method: "post",
  path: "/api/auth/send-otp",
  tags: ["Auth"],
  summary: "Send login OTP",
  description: "Sends a 6-digit OTP to the user's email address.",
  request: {
    body: {
      content: {
        "application/json": { schema: SendOtpInput },
      },
    },
  },
  responses: {
    200: {
      description: "OTP sent successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: "OTP sent successfully to your email" }),
            data: z.object({}).openapi({ example: {} }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/resend-otp",
  tags: ["Auth"],
  summary: "Resend login OTP",
  description: "Resends a 6-digit OTP to the user's email address. Maximum 3 attempts allowed per hour.",
  request: {
    body: {
      content: {
        "application/json": { schema: SendOtpInput },
      },
    },
  },
  responses: {
    200: {
      description: "OTP resent successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: "OTP resent successfully to your email" }),
            data: z.object({}).openapi({ example: {} }),
          }),
        },
      },
    },
    429: {
      description: "Too many attempts",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(false),
            message: z.string(),
            errors: z.array(z.any()).optional(),
          }),
        },
      },
    }
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/verify-otp",
  tags: ["Auth"],
  summary: "Verify login OTP",
  description: "Verifies the OTP and returns a JWT token.",
  request: {
    body: {
      content: {
        "application/json": { schema: VerifyOtpInput },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: "Login successful" }),
            data: z.object({
              token: z.string(),
              user: z.object({
                id: z.string().uuid(),
                email: z.string().email(),
                role: z.enum(["student", "mentor"]),
                onboardingCompleted: z.boolean(),
              }),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["Auth"],
  summary: "Get current user",
  description: "Returns the currently authenticated user based on JWT.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "User fetched successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: "User fetched successfully" }),
            data: z.object({
              user: AuthUserResponse,
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags: ["Auth"],
  summary: "Logout user",
  description: "Logout the currently authenticated user.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Logged out successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: "Logged out successfully" }),
            data: z.object({}).openapi({ example: {} }),
          }),
        },
      },
    },
  },
});
