import { Router } from "express";
import { validate } from "@/core/middleware/validate.middleware";
import * as controller from "./mentors.controller";
import * as schema from "./mentors.schema";
import "./mentors.openapi"; // Register openapi docs

const router = Router();

router.get("/", controller.getMentors);
router.get("/bookings", controller.getBookings);
router.get("/bookings/:id", controller.getBooking);
router.patch("/bookings/:id", validate(schema.updateBookingSchema), controller.updateBooking);
router.delete("/bookings/:id", controller.deleteBooking);

router.get("/:id", controller.getMentor);
router.patch("/:id", validate(schema.updateMentorSchema), controller.updateMentor);
router.delete("/:id", controller.deleteMentor);
router.patch("/:id/verify", controller.verifyMentor);

export const adminMentorsRoutes = router;
