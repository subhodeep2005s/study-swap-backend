import { Router } from "express";
import { validate } from "../../core/middleware/validate.middleware";
import * as authController from "./auth.controller";
import { loginSchema, registerSchema, adminLoginSchema, verifyOtpSchema, resendOtpSchema } from "./auth.schema";
import "./auth.openapi";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/admin/login", validate(adminLoginSchema), authController.adminLogin);

router.post("/verify-otp", validate(verifyOtpSchema), authController.verifyOTP);
router.post("/resend-otp", validate(resendOtpSchema), authController.resendOTP);

export default router;
