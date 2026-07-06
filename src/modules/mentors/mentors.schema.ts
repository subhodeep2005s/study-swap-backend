import { z } from "zod";

export const bookSessionSchema = z.object({
  body: z.object({
    mentorId: z.string().uuid("Invalid mentor ID"),
    planId: z.string().uuid("Invalid plan ID"),
    slotId: z.string().uuid("Invalid slot ID"),
  }),
});

export const getSlotsSchema = z.object({
  query: z.object({
    planId: z.string().uuid("Invalid plan ID"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, use YYYY-MM-DD"),
  }),
});
