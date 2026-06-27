import { registry } from "@/config/swagger";
import { z } from "zod";

const authTokenResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    token: z.string(),
  }),
});

const registerResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    mobileNumber: z.string(),
    token: z.string(),
  }),
});

const errorResponseSchema = z.object({
  success: z.boolean().default(false),
  message: z.string(),
});

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(8),
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            mobileNumber: z.string().min(10),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "User registered successfully",
      content: {
        "application/json": {
          schema: registerResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
    409: {
      description: "Email already registered",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login as user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": { schema: authTokenResponseSchema },
      },
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/admin/login",
  tags: ["Auth"],
  summary: "Login as admin",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Admin login successful",
      content: {
        "application/json": { schema: authTokenResponseSchema },
      },
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/verify-otp",
  tags: ["Auth"],
  summary: "Verify OTP for a user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            otp: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP verified successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({ id: z.string() }),
          }),
        },
      },
    },
    400: {
      description: "OTP expired or not requested",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
    401: {
      description: "Invalid OTP",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
    429: {
      description: "Too many failed attempts",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/resend-otp",
  tags: ["Auth"],
  summary: "Resend OTP for a user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP sent successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
    429: {
      description: "Too many requests",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
  },
});
