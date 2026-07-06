import { registry } from "@/config/openapi";
import { z } from "zod";
import { getExamsSchema } from "./exams.schema";

registry.registerPath({
  method: "get",
  path: "/exams/{countryId}",
  tags: ["Exams"],
  summary: "Get exams by country",
  description: "Returns a list of active exams for a given country.",
  request: {
    params: getExamsSchema.shape.params,
  },
  responses: {
    200: {
      description: "Exams fetched successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: "Exams fetched successfully" }),
            data: z.array(
              z.object({
                id: z.string().uuid(),
                name: z.string(),
              })
            ),
          }),
        },
      },
    },
  },
});
