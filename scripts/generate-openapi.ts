import { generateOpenApiDocument } from "../src/config/openapi";
import * as fs from "fs";
import * as path from "path";

// Import app to trigger registration of all routes and OpenAPI schemas
import "../src/app";

const doc = generateOpenApiDocument();
fs.writeFileSync(path.resolve("openapi.json"), JSON.stringify(doc, null, 2));

// Generate the static Scalar page content
const html = `<!doctype html>
<html>
  <head>
    <title>Scalar API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <!-- Load the Script -->
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

    <!-- Initialize the Scalar API Reference -->
    <script type="text/javascript">
      Scalar.createApiReference('#app', {
        "_integration": "express",
        "spec": {
          "content": ${JSON.stringify(doc)}
        },
        "theme": "default",
      });
    </script>
  </body>
</html>`;

fs.writeFileSync(path.resolve("scalar_page.html"), html);
console.log("Successfully updated openapi.json and scalar_page.html!");
process.exit(0);
