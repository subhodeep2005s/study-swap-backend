import { z } from "zod";

export const updateMentorSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    qualification: z.string().optional(),
    experience_years: z.number().optional(),
    hourly_price: z.number().optional(),
    is_verified: z.boolean().optional(),
  }),
});

export const updateBookingSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
    payment_status: z.enum(["pending", "paid", "refunded"]).optional(),
  }),
});
