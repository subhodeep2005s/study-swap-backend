import { Router } from "express";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { rbacMiddleware } from "@/core/middleware/rbac.middleware";
import { validate } from "@/core/middleware/validate.middleware";
import * as controller from "./mentors.controller";
import { bookSessionSchema, getSlotsSchema } from "./mentors.schema";
import "./mentors.openapi"; // Register openapi docs

const router = Router();

// Publicly accessible but we want them protected since the platform is protected
router.use(authMiddleware);

// Browse mentors
router.get("/", controller.getMentors);
router.get("/my-education-nodes-mentors", controller.getMentorsByMyEducationNodes);
router.get("/bookings", controller.getStudentBookings);
router.get("/bookings/:id", controller.getStudentBooking);
router.patch("/bookings/:id/cancel", controller.cancelBooking);

// Mentor details
router.get("/:id", controller.getMentor);
router.get("/:id/plans", controller.getMentorPlans);
router.get("/:id/slots", validate(getSlotsSchema), controller.getMentorSlots);

// Booking
router.post("/book", rbacMiddleware(["student"]), validate(bookSessionSchema), controller.bookSession);

export const mentorsRoutes = router;
