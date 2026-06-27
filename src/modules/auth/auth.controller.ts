import { Event, eventEmitter } from "@/config/event";
import { logger } from "@/config/logger";
import { asyncHandler } from "@/core/utils/async-handler";
import type { NextFunction, Request, Response } from "express";
import type { AdminLoginInput, LoginInput, RegisterInput } from "./auth.schema";
import * as authService from "./auth.service";

export const register = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const input = req.body as RegisterInput;
    logger.debug({ email: input.email }, "Register attempt");
    const result = await authService.register(input);
    logger.debug({ id: result.id }, "Register successful");

    const otp = await authService.generateOTP({ userId: result.id });

    eventEmitter.emit(Event.USER_REGISTERED, {
      userId: result.id,
      email: result.email,
      role: "user",
      otp: otp,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  },
);

export const login = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const input = req.body as LoginInput;
    logger.debug({ email: input.email }, "Login attempt");
    const result = await authService.login(input);
    logger.debug("Login successful");
    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const adminLogin = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const input = req.body as AdminLoginInput;
    logger.debug({ email: input.email }, "Admin login attempt");
    const result = await authService.adminLogin(input);
    logger.debug("Admin login successful");
    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const verifyOTP = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const input = req.body as { email: string; otp: string };
    logger.debug({ email: input.email }, "Verify OTP attempt");
    const result = await authService.verifyOTP(input);
    logger.debug({ userId: result.id }, "Verify OTP successful");
    res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      data: result,
    });
  },
);

export const resendOTP = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const input = req.body as { email: string };
    logger.debug({ email: input.email }, "Resend OTP attempt");
    const result = await authService.resendOTP(input);
    logger.debug({ userId: result.id }, "Resend OTP successful");

    eventEmitter.emit(Event.USER_REGISTERED, {
      userId: result.id,
      email: input.email,
      role: result.role,
      otp: result.otp,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully.",
    });
  },
);
