import { Router } from "express";
import { validate } from "@/core/middleware/validate.middleware";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { rbacMiddleware } from "@/core/middleware/rbac.middleware";
import * as adminController from "./admin.controller";
import { adminMentorsRoutes } from "./mentors/mentors.routes";
import { adminLoginSchema, createCountrySchema, updateCountrySchema, createExamSchema, updateExamSchema, updateStudentSchema, updateMentorUserSchema } from "./admin.schema";
import "./admin.openapi";

const router = Router();

router.post("/auth/login", validate(adminLoginSchema), adminController.login);

router.use(authMiddleware);
router.use(rbacMiddleware(["admin"]));

router.get("/auth/me", adminController.getMe);

router.get("/countries", adminController.getCountries);
router.post("/countries", validate(createCountrySchema), adminController.createCountry);
router.patch("/countries/:id", validate(updateCountrySchema), adminController.updateCountry);
router.delete("/countries/:id", adminController.deleteCountry);
router.get("/countries/:countryId/exams", adminController.getExamsByCountry);

router.get("/exams", adminController.getExams);
router.post("/exams", validate(createExamSchema), adminController.createExam);
router.patch("/exams/:id", validate(updateExamSchema), adminController.updateExam);
router.delete("/exams/:id", adminController.deleteExam);

router.get("/users", adminController.getUsers);
router.get("/users/students", adminController.getStudents);
router.get("/users/mentors", adminController.getMentorsUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("/users/students/:id", validate(updateStudentSchema), adminController.updateStudent);
router.patch("/users/mentors/:id", validate(updateMentorUserSchema), adminController.updateMentorUser);
router.delete("/users/:id", adminController.deleteUser);

router.use("/mentors", adminMentorsRoutes);

export default router;
