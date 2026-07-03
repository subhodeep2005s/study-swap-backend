import { Router } from "express";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { rbacMiddleware } from "@/core/middleware/rbac.middleware";
import { validate } from "@/core/middleware/validate.middleware";
import * as controller from "./mentor-bookings.controller";
import * as schema from "./mentor-bookings.schema";
import "./mentor-bookings.openapi"; // Register openapi docs

const router = Router();

// Only mentors can access these routes
router.use(authMiddleware);
router.use(rbacMiddleware(["mentor"]));

// Profile
router.get("/profile", controller.getProfile);
router.patch("/profile", validate(schema.updateMentorProfileSchema), controller.updateProfile);

// Plans
router.get("/plans", controller.getPlans);
router.post("/plans", validate(schema.createPlanSchema), controller.createPlan);
router.patch("/plans/:id", validate(schema.updatePlanSchema), controller.updatePlan);
router.delete("/plans/:id", controller.deletePlan);

// Slots
router.get("/slots", controller.getSlots);
router.post("/slots", validate(schema.createSlotSchema), controller.createSlot);
router.patch("/slots/:id", validate(schema.updateSlotSchema), controller.updateSlot);
router.delete("/slots/:id", controller.deleteSlot);

// Bookings
router.get("/bookings", controller.getBookings);
router.get("/bookings/:id", controller.getBooking);
router.patch("/bookings/:id/confirm", controller.confirmBooking);
router.patch("/bookings/:id/complete", controller.completeBooking);
router.patch("/bookings/:id/cancel", controller.cancelBooking);

export const mentorBookingsRoutes = router;
