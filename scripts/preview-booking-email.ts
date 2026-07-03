/**
 * Preview script: generates the Booking email template as an HTML file
 * and opens it in the browser for visual inspection.
 */
import { bookingConfirmationEmailTemplate } from "../src/core/utils/email-templates";
import fs from "node:fs";
import path from "node:path";

const html = bookingConfirmationEmailTemplate({
  recipientRole: "student",
  recipientName: "Alice",
  mentorName: "Bob",
  planTitle: "1-on-1 Math Tutoring",
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  durationMinutes: 60,
  meetingLink: "https://zoom.us/j/123456789"
});

const outputPath = path.resolve(process.cwd(), "scripts/booking-email-preview.html");
fs.writeFileSync(outputPath, html, "utf-8");
console.log(`✅ Booking Email preview written to: ${outputPath}`);
console.log("Open it in your browser to see the template.");
