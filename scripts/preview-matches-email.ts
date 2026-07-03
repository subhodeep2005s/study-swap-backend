/**
 * Preview script: generates the Matches email template as an HTML file
 * and opens it in the browser for visual inspection.
 */
import { matchesRefreshedEmailTemplate } from "../src/core/utils/email-templates";
import fs from "node:fs";
import path from "node:path";

const html = matchesRefreshedEmailTemplate({
  userName: "Subhodeep",
  totalMatches: 6,
  matches: [
    {
      fullName: "Jane Doe",
      profileImage: "https://i.pravatar.cc/150?u=jane",
      state: "California",
      studyTime: "evening",
      bio: "I love math and physics. Looking for someone to study with.",
      strongIn: "Calculus",
      needHelpWith: "Physics",
      selectedExams: ["SAT", "ACT"],
      matchReason: "Matched by exam and state"
    },
    {
      fullName: "John Smith",
      profileImage: null,
      state: "New York",
      studyTime: "morning",
      bio: "Early bird looking for a study buddy for the upcoming GRE.",
      strongIn: "Verbal",
      needHelpWith: "Quantitative",
      selectedExams: ["GRE"],
      matchReason: "Matched by exam"
    }
  ]
});

const outputPath = path.resolve(process.cwd(), "scripts/matches-email-preview.html");
fs.writeFileSync(outputPath, html, "utf-8");
console.log(`✅ Matches Email preview written to: ${outputPath}`);
console.log("Open it in your browser to see the template.");
