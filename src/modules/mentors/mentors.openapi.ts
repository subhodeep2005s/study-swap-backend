import { registry } from "@/config/openapi";
import { z } from "zod";
import { bookSessionSchema } from "./mentors.schema";

const tags = ["Mentors (Student View)"];
const security = [{ bearerAuth: [] }];

const mentorSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  qualification: z.string().nullable(),
  experience_years: z.number().nullable(),
  hourly_price: z.number().nullable(),
  rating: z.number().nullable(),
  total_reviews: z.number().nullable(),
  is_verified: z.boolean(),
  full_name: z.string().nullable(),
  profile_image: z.string().nullable(),
  bio: z.string().nullable(),
});

const planSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  duration_minutes: z.number(),
  price: z.number(),
});

const slotSchema = z.object({
  id: z.string().uuid(),
  start_time: z.string(),
  end_time: z.string(),
});

const bookingSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  payment_status: z.string(),
  amount: z.number(),
  meeting_link: z.string().nullable(),
  created_at: z.string(),
  plan_title: z.string(),
  duration_minutes: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  mentor_title: z.string().nullable(),
  mentor_name: z.string().nullable(),
  mentor_image: z.string().nullable(),
});

const Mentor = registry.register("Mentor", mentorSchema);
const MentorPlan = registry.register("MentorPlan", planSchema);
const MentorSlot = registry.register("MentorSlot", slotSchema);
const MentorBooking = registry.register("MentorBooking", bookingSchema);
const BookSessionInput = registry.register("BookSessionInput", bookSessionSchema.shape.body);

registry.registerPath({
  method: "get",
  path: "/api/mentors",
  tags,
  security,
  summary: "Get all verified mentors",
  description: "Browse verified mentors.",
  responses: {
    200: {
      description: "Mentors fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(Mentor) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/mentors/my-exams-mentors",
  tags,
  security,
  summary: "Get mentors by user exams",
  description: "Browse verified mentors that match the user's selected exams.",
  responses: {
    200: {
      description: "Mentors fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(Mentor) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/mentors/{id}",
  tags,
  security,
  summary: "Get mentor profile",
  description: "Get mentor details.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Mentor fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: Mentor.extend({ about: z.string().nullable() }) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/mentors/{id}/plans",
  tags,
  security,
  summary: "Get mentor plans",
  description: "Get active mentor pricing plans.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Mentor plans fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(MentorPlan) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/mentors/{id}/slots",
  tags,
  security,
  summary: "Get mentor slots",
  description: "Get available mentor slots.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Mentor slots fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(MentorSlot) }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/mentors/book",
  tags,
  security,
  summary: "Book mentor session",
  description: "Book a mentor session (locks slot and generates meeting link).",
  request: {
    body: { content: { "application/json": { schema: BookSessionInput } } },
  },
  responses: {
    201: {
      description: "Session booked successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ bookingId: z.string(), meetingLink: z.string() }) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/mentors/bookings",
  tags,
  security,
  summary: "Get student bookings",
  description: "View all bookings for the authenticated student.",
  responses: {
    200: {
      description: "Bookings fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(MentorBooking) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/mentors/bookings/{id}",
  tags,
  security,
  summary: "Get student booking",
  description: "View a specific booking for the authenticated student.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Booking fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: MentorBooking }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/mentors/bookings/{id}/cancel",
  tags,
  security,
  summary: "Cancel student booking",
  description: "Cancel a booking.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Booking cancelled successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});
