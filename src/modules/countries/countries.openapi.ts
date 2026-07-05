import { registry } from "@/config/openapi";
import { z } from "zod";

registry.registerPath({
  method: "get",
  path: "/countries",
  tags: ["Countries"],
  summary: "Get all countries",
  description: "Returns a list of all countries.",
  responses: {
    200: {
      description: "Countries fetched successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: "Countries fetched successfully" }),
            data: z.object({
              countries: z.array(
                z.object({
                  id: z.string().uuid(),
                  name: z.string(),
                  flag: z.string().nullable(),
                  iso_code: z.string().nullable().optional(),
                })
              ),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/countries/{countryCode}/states",
  tags: ["Countries"],
  summary: "Get states by country",
  description: "Returns a list of states for a specific country.",
  request: {
    params: z.object({
      countryCode: z.string().length(2).openapi({ example: "IN" }),
    }),
  },
  responses: {
    200: {
      description: "States fetched successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string().openapi({ example: "States fetched successfully" }),
            data: z.object({
              states: z.array(z.any()),
            }),
          }),
        },
      },
    },
  },
});
