import { registry } from "@/config/openapi";
import { z } from "zod";
import { getExamsSchema } from "./exams.schema";

registry.registerPath({
  method: "get",
  path: "/exams/{countryId}",
  tags: ["Education Nodes"],
  summary: "Get education nodes by country",
  description: "Returns the full hierarchical tree of education nodes for a given country. Each node has a parentId that references another node. Root nodes have parentId = null. Frontend should recursively build the tree from this flat array.",
  request: {
    params: getExamsSchema.shape.params,
  },
  responses: {
    200: {
      description: "Education nodes fetched",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(
              z.object({
                id: z.string().uuid(),
                parent_id: z.string().uuid().nullable().describe("The parent node ID. Null for root-level nodes."),
                name: z.string().describe("The display name of this node (e.g., 'CBSE', 'Class 10', 'Mathematics')."),
                node_type: z.string().describe("The conceptual type (BOARD, CLASS, SUBJECT, EXAM, COURSE, etc.)."),
                sort_order: z.number().describe("Sorting priority among siblings."),
              })
            ),
          }),
        },
      },
    },
  },
});
