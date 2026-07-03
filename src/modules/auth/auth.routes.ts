import { Router } from "express";
import { validate } from "../../core/middleware/validate.middleware";
import { authMiddleware } from "../../core/middleware/auth.middleware";
import * as authController from "./auth.controller";
import { sendOtpSchema, verifyOtpSchema } from "./auth.schema";
import "./auth.openapi";

const router = Router();

router.post("/send-otp", validate(sendOtpSchema), authController.sendOtp);
router.post("/resend-otp", validate(sendOtpSchema), authController.resendOtp);
router.post("/verify-otp", validate(verifyOtpSchema), authController.verifyOtp);

router.get("/me", authMiddleware, authController.getMe);
router.post("/logout", authMiddleware, authController.logout);

export default router;
