import { z } from "zod";

export const updateMentorProfileSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").optional(),
    qualification: z.string().min(1, "Qualification is required").optional(),
    experience_years: z.number().min(0, "Experience must be positive").optional(),
    hourly_price: z.number().min(0, "Price must be positive").optional(),
    about: z.string().optional(),
    country_id: z.string().uuid("Invalid country ID").nullable().optional(),
    state: z.string().optional(),
    exam_ids: z.array(z.string().uuid("Invalid exam ID")).optional(),
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

export const createSlotSchema = z.object({
  body: z.object({
    start_time: z.string().datetime("Invalid start time"),
    end_time: z.string().datetime("Invalid end time"),
  }),
});

export const updateSlotSchema = z.object({
  body: createSlotSchema.shape.body.partial(),
});
