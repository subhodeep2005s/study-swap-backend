/**
 * Preview script: generates the OTP email template as an HTML file
 * and opens it in the browser for visual inspection.
 */
import { otpEmailTemplate } from "../src/core/utils/email-templates";
import fs from "node:fs";
import path from "node:path";

const html = otpEmailTemplate("847291");

const outputPath = path.resolve(process.cwd(), "scripts/otp-email-preview.html");
fs.writeFileSync(outputPath, html, "utf-8");
console.log(`✅ Email preview written to: ${outputPath}`);
console.log("Open it in your browser to see the template.");
