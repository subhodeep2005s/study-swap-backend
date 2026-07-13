import { z } from "zod";

export const updateMentorProfileSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").optional(),
    qualification: z.string().min(1, "Qualification is required").optional(),
    experience_years: z.number().min(0, "Experience must be positive").optional(),
    hourly_price: z.number().min(0, "Price must be positive").optional(),
    about: z.string().optional(),
    phone_number: z.string().min(5, "Phone number is too short").max(20).optional(),
    country_id: z.string().uuid("Invalid country ID").nullable().optional(),
    state: z.string().optional(),
    education_node_ids: z.array(z.string().uuid("Invalid education node ID")).optional(),
  }),
});

export const createPlanSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    duration_minutes: z.number().min(1, "Duration must be at least 1 minute"),
    price: z.number().min(0, "Price must be non-negative"),
    is_active: z.boolean().default(true),
  }),
});

export const updatePlanSchema = z.object({
  body: createPlanSchema.shape.body.partial(),
});

export const updateAvailabilitySchema = z.object({
  body: z.object({
    availability: z.array(z.object({
      day_of_week: z.number().int().min(0).max(6),
      start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM"),
      end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM"),
    }))
  })
});
