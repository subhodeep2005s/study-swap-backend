import { registry } from "@/config/openapi";
import { presignedUrlSchema } from "./uploads.schema";

registry.registerPath({
  method: "post",
  path: "/uploads/presigned-url",
  tags: ["Uploads"],
  summary: "Generate a presigned URL for file upload",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: presignedUrlSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  uploadUrl: { type: "string" },
                  key: { type: "string" },
                  publicUrl: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    400: { description: "Bad request" },
    401: { description: "Unauthorized" },
  },
});
