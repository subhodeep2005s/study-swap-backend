import { Router } from "express";
import { validate } from "../../core/middleware/validate.middleware";
import { authMiddleware } from "../../core/middleware/auth.middleware";
import * as authController from "./auth.controller";
import { sendOtpSchema, verifyOtpSchema, updateNotificationTokenSchema } from "./auth.schema";
import "./auth.openapi";

const router = Router();

router.post("/send-otp", validate(sendOtpSchema), authController.sendOtp);
router.post("/resend-otp", validate(sendOtpSchema), authController.resendOtp);
router.post("/verify-otp", validate(verifyOtpSchema), authController.verifyOtp);

router.get("/me", authMiddleware, authController.getMe);
router.delete("/me", authMiddleware, authController.deleteAccount);
router.patch("/notification-token", authMiddleware, validate(updateNotificationTokenSchema), authController.updateNotificationToken);
router.post("/logout", authMiddleware, authController.logout);

export default router;
