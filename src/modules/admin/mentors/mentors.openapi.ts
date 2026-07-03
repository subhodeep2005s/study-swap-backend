import { registry } from "@/config/openapi";
import { z } from "zod";
import * as schema from "./mentors.schema";

const tags = ["Admin Mentors"];
const security = [{ bearerAuth: [] }];

const AdminUpdateMentorInput = registry.register("AdminUpdateMentorInput", schema.updateMentorSchema.shape.body);
const AdminUpdateBookingInput = registry.register("AdminUpdateBookingInput", schema.updateBookingSchema.shape.body);

registry.registerPath({
  method: "get",
  path: "/api/admin/mentors",
  tags,
  security,
  summary: "Get all mentors",
  description: "View all mentors in the system.",
  responses: {
    200: {
      description: "Mentors fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(z.any()) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/mentors/{id}",
  tags,
  security,
  summary: "Get mentor",
  description: "View a specific mentor.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Mentor fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/mentors/{id}",
  tags,
  security,
  summary: "Update mentor",
  description: "Update mentor details.",
  request: { 
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: AdminUpdateMentorInput } } }
  },
  responses: {
    200: {
      description: "Mentor updated successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/mentors/{id}",
  tags,
  security,
  summary: "Delete mentor",
  description: "Delete a mentor.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Mentor deleted successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/mentors/{id}/verify",
  tags,
  security,
  summary: "Verify mentor",
  description: "Mark a mentor as verified.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Mentor verified successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/mentors/bookings",
  tags,
  security,
  summary: "Get all bookings",
  description: "View all bookings in the system.",
  responses: {
    200: {
      description: "Bookings fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(z.any()) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/mentors/bookings/{id}",
  tags,
  security,
  summary: "Get booking",
  description: "View a specific booking.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Booking fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/mentors/bookings/{id}",
  tags,
  security,
  summary: "Update booking",
  description: "Update a booking status.",
  request: { 
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: AdminUpdateBookingInput } } }
  },
  responses: {
    200: {
      description: "Booking updated successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/mentors/bookings/{id}",
  tags,
  security,
  summary: "Delete booking",
  description: "Delete a booking.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Booking deleted successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});
