import { z } from "zod";
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      version: "1.0.0",
      title: "StudySwap API",
      description: "Backend API documentation for StudySwap",
    },
    servers: [
      {
        url: "/",
        description: "API server",
      },
    ],
    security: [{ bearerAuth: [] }],
  });
}

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});
