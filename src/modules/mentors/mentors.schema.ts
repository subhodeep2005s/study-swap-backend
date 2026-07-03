import { z } from "zod";

export const bookSessionSchema = z.object({
  body: z.object({
    mentorId: z.string().uuid("Invalid mentor ID"),
    planId: z.string().uuid("Invalid plan ID"),
    slotId: z.string().uuid("Invalid slot ID"),
  }),
});
