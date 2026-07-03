import { z } from "zod";

export const getExamsSchema = z.object({
  params: z.object({
    countryId: z.string().uuid("Invalid country ID"),
  }),
});

export type GetExamsInput = z.infer<typeof getExamsSchema>["params"];
