import { apiReference } from "@scalar/express-api-reference";
import { generateOpenApiDocument } from "./openapi";

export const scalarMiddleware = apiReference({
  spec: {
    content: generateOpenApiDocument(),
  },
  theme: "default",
});
