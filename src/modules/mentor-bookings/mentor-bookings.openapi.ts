import { registry } from "@/config/openapi";
import { z } from "zod";
import * as schema from "./mentor-bookings.schema";

const tags = ["Mentor Dashboard"];
const security = [{ bearerAuth: [] }];

const UpdateMentorProfileInput = registry.register("UpdateMentorProfileInput", schema.updateMentorProfileSchema.shape.body);
const CreatePlanInput = registry.register("CreatePlanInput", schema.createPlanSchema.shape.body);
const UpdatePlanInput = registry.register("UpdatePlanInput", schema.updatePlanSchema.shape.body);
const UpdateAvailabilityInput = registry.register("UpdateAvailabilityInput", schema.updateAvailabilitySchema.shape.body);

// =========================================================================
// Reusable response schemas
// =========================================================================
const MentorDashboardProfileResponse = registry.register("MentorDashboardProfileResponse", z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().nullable(),
  qualification: z.string().nullable(),
  experience_years: z.number().nullable(),
  hourly_price: z.string().nullable().describe("Stored as decimal string"),
  rating: z.string().nullable().describe("Stored as decimal string"),
  total_reviews: z.number(),
  about: z.string().nullable(),
  is_verified: z.boolean(),
  full_name: z.string().nullable(),
  profile_image: z.string().nullable(),
  country_id: z.string().uuid().nullable(),
  state: z.string().nullable(),
  email: z.string().email(),
  exams: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
}));

const PlanResponse = registry.register("MentorDashboardPlanResponse", z.object({
  id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  duration_minutes: z.number(),
  price: z.string().describe("Stored as decimal string"),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}));

const AvailabilityResponse = registry.register("MentorDashboardAvailabilityResponse", z.object({
  day_of_week: z.number().int(),
  start_time: z.string(),
  end_time: z.string(),
}));

const BookingResponse = registry.register("MentorDashboardBookingResponse", z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  payment_status: z.string(),
  amount: z.string().describe("Stored as decimal string"),
  meeting_link: z.string().nullable(),
  created_at: z.string(),
  plan_title: z.string(),
  duration_minutes: z.number(),
  start_time: z.string().describe("ISO 8601 datetime"),
  end_time: z.string().describe("ISO 8601 datetime"),
  student_email: z.string().email(),
  student_name: z.string().nullable(),
  student_image: z.string().nullable(),
}));

// =========================================================================
// Profile
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/mentor/profile",
  tags,
  security,
  summary: "Get mentor profile",
  description: "Get current authenticated mentor's profile.",
  responses: {
    200: {
      description: "Profile fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: MentorDashboardProfileResponse }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/mentor/profile",
  tags,
  security,
  summary: "Update mentor profile",
  description: "Update current authenticated mentor's profile details.",
  request: {
    body: { content: { "application/json": { schema: UpdateMentorProfileInput } } },
  },
  responses: {
    200: {
      description: "Profile updated successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: MentorDashboardProfileResponse }) } },
    },
  },
});

// =========================================================================
// Plans
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/mentor/plans",
  tags,
  security,
  summary: "Get mentor plans",
  description: "Get all pricing plans for the mentor.",
  responses: {
    200: {
      description: "Plans fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(PlanResponse) }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/mentor/plans",
  tags,
  security,
  summary: "Create plan",
  description: "Create a new pricing plan.",
  request: {
    body: { content: { "application/json": { schema: CreatePlanInput } } },
  },
  responses: {
    201: {
      description: "Plan created successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: PlanResponse }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/mentor/plans/{id}",
  tags,
  security,
  summary: "Update plan",
  description: "Update a pricing plan.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdatePlanInput } } },
  },
  responses: {
    200: {
      description: "Plan updated successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: PlanResponse }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/mentor/plans/{id}",
  tags,
  security,
  summary: "Delete plan",
  description: "Delete a pricing plan.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Plan deleted successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});

// =========================================================================
// Availability
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/mentor/availability",
  tags,
  security,
  summary: "Get availability",
  description: "Get recurring weekly availability.",
  responses: {
    200: {
      description: "Availability fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(AvailabilityResponse) }) } },
    },
  },
});

registry.registerPath({
  method: "put",
  path: "/mentor/availability",
  tags,
  security,
  summary: "Update availability",
  description: "Update recurring weekly availability. Overwrites existing availability.",
  request: {
    body: { content: { "application/json": { schema: UpdateAvailabilityInput } } },
  },
  responses: {
    200: {
      description: "Availability updated successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(AvailabilityResponse) }) } },
    },
  },
});

// =========================================================================
// Bookings
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/mentor/bookings",
  tags,
  security,
  summary: "Get bookings",
  description: "Get all bookings for the mentor.",
  responses: {
    200: {
      description: "Bookings fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(BookingResponse) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/mentor/bookings/{id}",
  tags,
  security,
  summary: "Get booking",
  description: "Get a specific booking.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Booking fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: BookingResponse }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/mentor/bookings/{id}/confirm",
  tags,
  security,
  summary: "Confirm booking",
  description: "Confirm a booking.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Booking confirmed successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: BookingResponse }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/mentor/bookings/{id}/complete",
  tags,
  security,
  summary: "Complete booking",
  description: "Complete a booking.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Booking completed successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: BookingResponse }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/mentor/bookings/{id}/cancel",
  tags,
  security,
  summary: "Cancel booking",
  description: "Cancel a booking.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Booking cancelled successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});
