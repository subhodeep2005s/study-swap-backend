import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as authService from "./auth.service";
import type { SendOtpInput, VerifyOtpInput, UpdateNotificationTokenInput } from "./auth.schema";

export const sendOtp = asyncHandler(
  async (req: Request<unknown, unknown, SendOtpInput>, res: Response) => {
    await authService.sendOtp(req.body.email);
    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      data: {},
    });
  },
);

export const resendOtp = asyncHandler(
  async (req: Request<unknown, unknown, SendOtpInput>, res: Response) => {
    await authService.resendOtp(req.body.email);
    res.status(200).json({
      success: true,
      message: "OTP resent successfully to your email",
      data: {},
    });
  },
);

export const verifyOtp = asyncHandler(
  async (req: Request<unknown, unknown, VerifyOtpInput>, res: Response) => {
    const data = await authService.verifyOtp(req.body.email, req.body.otp, req.body.role as any);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  },
);

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
      errors: [],
    });
    return;
  }

  const user = await authService.getMe(req.user.id);
  res.status(200).json({
    success: true,
    message: "User fetched successfully",
    data: { user },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
    data: {},
  });
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
      errors: [],
    });
    return;
  }

  await authService.deleteAccount(req.user.id);
  res.status(200).json({
    success: true,
    message: "Account deleted successfully",
    data: {},
  });
});

export const updateNotificationToken = asyncHandler(async (req: Request<unknown, unknown, UpdateNotificationTokenInput>, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
    return;
  }
  
  await authService.updateNotificationToken(req.user.id, req.body.notificationToken);
  res.status(200).json({
    success: true,
    message: "Notification token updated successfully",
    data: {}
  });
});
