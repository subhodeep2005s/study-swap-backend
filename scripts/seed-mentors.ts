import { config } from "dotenv";
config();

import { query, getClient } from "../src/config/db";
import { faker } from "@faker-js/faker";

const EXAMS = ["JEE", "NEET", "UPSC"];
const MENTORS_PER_EXAM = 10;

async function seedMentors() {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    console.log("Started seeding mentors...");

    // Get India
    const countryRes = await client.query("SELECT id FROM countries WHERE name = 'India'");
    if (countryRes.rows.length === 0) {
      throw new Error("India not found in database. Please run seed-data.ts first.");
    }
    const countryId = countryRes.rows[0].id;

    for (const examName of EXAMS) {
      const examRes = await client.query("SELECT id FROM exams WHERE name = $1 AND country_id = $2", [examName, countryId]);
      if (examRes.rows.length === 0) {
        throw new Error(`Exam ${examName} not found.`);
      }
      const examId = examRes.rows[0].id;

      console.log(`Seeding ${MENTORS_PER_EXAM} mentors for ${examName}...`);

      for (let i = 0; i < MENTORS_PER_EXAM; i++) {
        const email = faker.internet.email({ provider: 'mentor.studyswap.test' }).toLowerCase();

        // 1. Create User
        const userRes = await client.query(
          `INSERT INTO users (email, role, email_verified, onboarding_completed)
           VALUES ($1, 'mentor', true, true) RETURNING id`,
          [email]
        );
        const userId = userRes.rows[0].id;
        console.log(`Created user ${userId}`);

        // 2. Create Profile
        await client.query(
          `INSERT INTO profiles (user_id, country_id, full_name, profile_image, age, gender, state, bio, strong_in)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            userId,
            countryId,
            faker.person.fullName(),
            faker.image.avatar(),
            faker.number.int({ min: 22, max: 45 }),
            faker.helpers.arrayElement(['male', 'female', 'other']),
            faker.location.state(),
            faker.person.bio(),
            examName,
          ]
        );
        console.log(`Created profile for ${userId}`);

        // 3. User Exams
        await client.query(
          `INSERT INTO user_exams (user_id, exam_id) VALUES ($1, $2)`,
          [userId, examId]
        );
        console.log(`Created user_exam for ${userId}`);

        // 4. Create Mentor Profile
        const mentorRes = await client.query(
          `INSERT INTO mentors (user_id, title, qualification, experience_years, hourly_price, rating, total_reviews, about, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING id`,
          [
            userId,
            `Expert ${examName} Mentor`,
            faker.person.jobTitle(),
            faker.number.int({ min: 2, max: 15 }),
            faker.number.int({ min: 200, max: 2000 }), // price in INR
            faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
            faker.number.int({ min: 10, max: 500 }),
            faker.lorem.paragraphs(2),
          ]
        );
        const mentorId = mentorRes.rows[0].id;
        console.log(`Created mentor ${mentorId}`);

        // 5. Create Plans
        const plan1Res = await client.query(
          `INSERT INTO mentor_plans (mentor_id, title, description, duration_minutes, price, is_active)
           VALUES ($1, '1 Hour Session', 'Detailed 1-on-1 discussion', 60, $2, true) RETURNING id`,
          [mentorId, faker.number.int({ min: 500, max: 1000 })]
        );
        const plan2Res = await client.query(
          `INSERT INTO mentor_plans (mentor_id, title, description, duration_minutes, price, is_active)
           VALUES ($1, 'Quick Doubt Solving', '30 min quick session', 30, $2, true) RETURNING id`,
          [mentorId, faker.number.int({ min: 250, max: 500 })]
        );
        console.log(`Created plans for ${mentorId}`);

        // 6. Create Slots (next 7 days)
        for (let days = 1; days <= 7; days++) {
          const baseDate = new Date();
          baseDate.setDate(baseDate.getDate() + days);
          baseDate.setHours(10, 0, 0, 0); // Start at 10 AM

          // 3 slots per day
          for (let s = 0; s < 3; s++) {
            const startTime = new Date(baseDate.getTime() + s * 2 * 60 * 60 * 1000); // 10 AM, 12 PM, 2 PM
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour slot
            
            await client.query(
              `INSERT INTO mentor_slots (mentor_id, start_time, end_time, is_booked)
               VALUES ($1, $2, $3, false)`,
              [mentorId, startTime, endTime]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    console.log("Successfully seeded mentors!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed mentors:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedMentors();
