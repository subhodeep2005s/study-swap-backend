import { getClient } from "../../config/db";
import { logger } from "../../config/logger";
import { faker } from "@faker-js/faker";
import { fileURLToPath } from 'url';

export async function runMentorExtrasSeeder() {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    logger.info("Seeding Mentor Plans & Availability...");

    // Find all mentors
    const mentorsRes = await client.query(`SELECT id FROM mentors`);
    const mentors = mentorsRes.rows;

    let plansAdded = 0;
    let availabilityAdded = 0;

    for (const mentor of mentors) {
      // Check if mentor has plans
      const plansRes = await client.query(`SELECT count(*) FROM mentor_plans WHERE mentor_id = $1`, [mentor.id]);
      if (parseInt(plansRes.rows[0].count) === 0) {
        // Add 1-2 random plans
        const numPlans = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numPlans; i++) {
          const duration = [30, 45, 60, 90][Math.floor(Math.random() * 4)];
          const price = faker.commerce.price({ min: 100, max: 2000, dec: 0 });
          const title = faker.helpers.arrayElement([
            "1-on-1 Mentorship Call",
            "Mock Interview",
            "Resume Review",
            "Career Guidance",
            "Doubt Clearing Session",
            "Strategy Session"
          ]);
          
          await client.query(`
            INSERT INTO mentor_plans (mentor_id, title, description, duration_minutes, price, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
          `, [mentor.id, title, faker.lorem.paragraph(), duration, price]);
          plansAdded++;
        }
      }

      // Check if mentor has availability
      const availRes = await client.query(`SELECT count(*) FROM mentor_availability WHERE mentor_id = $1`, [mentor.id]);
      if (parseInt(availRes.rows[0].count) === 0) {
        // Add availability for 2-4 random days of the week
        const days = faker.helpers.arrayElements([0, 1, 2, 3, 4, 5, 6], faker.number.int({ min: 2, max: 4 }));
        for (const day of days) {
          // e.g. '09:00:00' to '12:00:00' or '14:00:00' to '18:00:00'
          const morning = Math.random() > 0.5;
          const startTime = morning ? "09:00:00" : "14:00:00";
          const endTime = morning ? "13:00:00" : "18:00:00";

          await client.query(`
            INSERT INTO mentor_availability (mentor_id, day_of_week, start_time, end_time)
            VALUES ($1, $2, $3, $4)
          `, [mentor.id, day, startTime, endTime]);
          availabilityAdded++;
        }
      }
    }

    await client.query("COMMIT");
    logger.info(`Successfully added ${plansAdded} plans and ${availabilityAdded} availability slots.`);
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ error }, "Failed to seed mentor extras");
    throw error;
  } finally {
    client.release();
  }
}

// Allow running directly
// @ts-ignore
if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
  runMentorExtrasSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
