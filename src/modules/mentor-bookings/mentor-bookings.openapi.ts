import { registry } from "@/config/openapi";
import { z } from "zod";
import * as schema from "./mentor-bookings.schema";

const tags = ["Mentor Dashboard"];
const security = [{ bearerAuth: [] }];

const UpdateMentorProfileInput = registry.register("UpdateMentorProfileInput", schema.updateMentorProfileSchema.shape.body);
const CreatePlanInput = registry.register("CreatePlanInput", schema.createPlanSchema.shape.body);
const UpdatePlanInput = registry.register("UpdatePlanInput", schema.updatePlanSchema.shape.body);
const CreateSlotInput = registry.register("CreateSlotInput", schema.createSlotSchema.shape.body);
const UpdateSlotInput = registry.register("UpdateSlotInput", schema.updateSlotSchema.shape.body);

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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(z.any()) }) } },
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/mentor/slots",
  tags,
  security,
  summary: "Get slots",
  description: "Get all availability slots.",
  responses: {
    200: {
      description: "Slots fetched successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(z.any()) }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/mentor/slots",
  tags,
  security,
  summary: "Create slot",
  description: "Create a new availability slot.",
  request: {
    body: { content: { "application/json": { schema: CreateSlotInput } } },
  },
  responses: {
    201: {
      description: "Slot created successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/mentor/slots/{id}",
  tags,
  security,
  summary: "Update slot",
  description: "Update an availability slot.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdateSlotInput } } },
  },
  responses: {
    200: {
      description: "Slot updated successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/mentor/slots/{id}",
  tags,
  security,
  summary: "Delete slot",
  description: "Delete an availability slot.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Slot deleted successfully",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(z.any()) }) } },
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});
