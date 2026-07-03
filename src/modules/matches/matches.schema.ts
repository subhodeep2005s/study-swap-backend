import { z } from "zod";

export const matchIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid match ID format"),
  }),
});
