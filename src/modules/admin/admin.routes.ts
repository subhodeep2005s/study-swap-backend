import { Router } from "express";
import { validate } from "@/core/middleware/validate.middleware";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { rbacMiddleware } from "@/core/middleware/rbac.middleware";
import * as adminController from "./admin.controller";
import { 
  adminLoginSchema, 
  createCountrySchema, 
  updateCountrySchema, 
  createEducationNodeSchema, 
  updateEducationNodeSchema, 
  updateStudentSchema, 
  updateMentorUserSchema,
  updateMentorSchema,
  updateBookingSchema,
  updatePlanSchema,
  updateAvailabilitySchema
} from "./admin.schema";
import "./admin.openapi";

const router = Router();

// =========================================================================
// Auth (public)
// =========================================================================
router.post("/auth/login", validate(adminLoginSchema), adminController.login);

// =========================================================================
// Protected routes
// =========================================================================
router.use(authMiddleware);
router.use(rbacMiddleware(["admin"]));

router.get("/auth/me", adminController.getMe);

// =========================================================================
// Dashboard
// =========================================================================
router.get("/dashboard", adminController.getDashboard);

// =========================================================================
// Countries
// =========================================================================
router.get("/countries", adminController.getCountries);
router.post("/countries", validate(createCountrySchema), adminController.createCountry);
router.patch("/countries/:id", validate(updateCountrySchema), adminController.updateCountry);
router.delete("/countries/:id", adminController.deleteCountry);
router.get("/countries/:countryId/education-nodes", adminController.getEducationNodesByCountry);

// =========================================================================
// Education Nodes
// =========================================================================
router.get("/education-nodes", adminController.getEducationNodes);
router.post("/education-nodes", validate(createEducationNodeSchema), adminController.createEducationNode);
router.patch("/education-nodes/:id", validate(updateEducationNodeSchema), adminController.updateEducationNode);
router.delete("/education-nodes/:id", adminController.deleteEducationNode);

// =========================================================================
// Users
// =========================================================================
router.get("/users", adminController.getUsers);
router.get("/users/students", adminController.getStudents);
router.get("/users/mentors", adminController.getMentorsUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("/users/students/:id", validate(updateStudentSchema), adminController.updateStudent);
router.patch("/users/mentors/:id", validate(updateMentorUserSchema), adminController.updateMentorUser);
router.delete("/users/:id", adminController.deleteUser);

// =========================================================================
// Matches
// =========================================================================
router.get("/matches", adminController.getMatches);
router.get("/matches/user/:userId", adminController.getMatchesByUser);
router.delete("/matches/:id", adminController.deleteMatch);

// =========================================================================
// Audit Logs
// =========================================================================
router.get("/audit-logs", adminController.getAuditLogs);

// =========================================================================
// Mentors (Merged)
// =========================================================================
router.get("/mentors", adminController.getMentors);

// =========================================================================
// Bookings (must be before /mentors/:id to avoid conflict)
// =========================================================================
router.get("/mentors/bookings", adminController.getBookings);
router.get("/mentors/bookings/:id", adminController.getBooking);
router.patch("/mentors/bookings/:id", validate(updateBookingSchema), adminController.updateBooking);
router.delete("/mentors/bookings/:id", adminController.deleteBooking);
router.patch("/mentors/bookings/:id/regenerate-meet", adminController.regenerateMeetLink);

// =========================================================================
// Availability (Merged)
// =========================================================================
router.get("/mentors/:id/availability", adminController.getMentorAvailability);
router.put("/mentors/:id/availability", validate(updateAvailabilitySchema), adminController.updateMentorAvailability);

// =========================================================================
// Plans (global plan CRUD)
// =========================================================================
router.patch("/mentors/plans/:id", validate(updatePlanSchema), adminController.updatePlan);
router.delete("/mentors/plans/:id", adminController.deletePlan);

// =========================================================================
// Mentor by ID & sub-resources
// =========================================================================
router.get("/mentors/:id", adminController.getMentor);
router.patch("/mentors/:id", validate(updateMentorSchema), adminController.updateMentor);
router.delete("/mentors/:id", adminController.deleteMentor);
router.patch("/mentors/:id/verify", adminController.verifyMentor);

router.get("/mentors/:id/bookings", adminController.getBookingsByMentor);
router.get("/mentors/:id/plans", adminController.getMentorPlans);

export default router;
