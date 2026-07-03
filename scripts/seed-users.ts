import { query, closePool } from "../src/config/db";
import { v4 as uuidv4 } from "uuid";

async function seedUsers() {
  console.log("Seeding test users for JEE, NEET, and UPSC in India...");
  try {
    // Get India's country ID
    const countryRes = await query("SELECT id FROM countries WHERE name = 'India' LIMIT 1");
    if (countryRes.rows.length === 0) {
      throw new Error("India not found in database. Seed countries first.");
    }
    const countryId = countryRes.rows[0].id;

    // Get Exam IDs
    const examsRes = await query("SELECT id, name FROM exams WHERE country_id = $1 AND name IN ('JEE', 'NEET', 'UPSC')", [countryId]);
    const examMap: Record<string, string> = {};
    for (const row of examsRes.rows) {
      examMap[row.name] = row.id;
    }

    if (!examMap['JEE'] || !examMap['NEET'] || !examMap['UPSC']) {
      throw new Error("Target exams not found in database.");
    }

    const states = ["Maharashtra", "Delhi", "Karnataka", "West Bengal", "Tamil Nadu"];

    const examsToSeed = ['JEE', 'NEET', 'UPSC'];
    
    for (const exam of examsToSeed) {
      console.log(`Seeding 10 users for ${exam}...`);
      for (let i = 1; i <= 10; i++) {
        const userId = uuidv4();
        const email = `test_${exam.toLowerCase()}_${i}@studyswap.local`;
        
        // Insert User
        await query(
          `INSERT INTO users (id, email, role, email_verified, onboarding_completed) 
           VALUES ($1, $2, 'student', true, true)`,
          [userId, email]
        );

        // Insert Profile
        const state = states[i % states.length];
        await query(
          `INSERT INTO profiles (user_id, country_id, full_name, age, gender, state, bio, strong_in, need_help_with, study_time, looking_for) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            userId,
            countryId,
            `Test ${exam} Student ${i}`,
            18 + (i % 5),
            i % 2 === 0 ? 'male' : 'female',
            state,
            `I am a dedicated ${exam} aspirant from ${state}.`,
            'Physics, Chemistry',
            'Mathematics, Biology',
            'evening',
            ['study_partner']
          ]
        );

        // Insert User Exam
        await query(
          `INSERT INTO user_exams (user_id, exam_id) VALUES ($1, $2)`,
          [userId, examMap[exam]]
        );
      }
    }

    console.log("Successfully seeded 30 users!");
  } catch (error) {
    console.error("Failed to seed users:", error);
  } finally {
    await closePool();
  }
}

seedUsers();
