/**
 * Preview script: generates the Welcome email template as an HTML file
 * and opens it in the browser for visual inspection.
 */
import { welcomeEmailTemplate } from "../src/core/utils/email-templates";
import fs from "node:fs";
import path from "node:path";

const html = welcomeEmailTemplate();

const outputPath = path.resolve(process.cwd(), "scripts/welcome-email-preview.html");
fs.writeFileSync(outputPath, html, "utf-8");
console.log(`✅ Welcome Email preview written to: ${outputPath}`);
console.log("Open it in your browser to see the template.");
