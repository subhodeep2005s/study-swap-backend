import { getClient } from "../../config/db";
import { logger } from "../../config/logger";
import { faker } from "@faker-js/faker";
import { fileURLToPath } from 'url';

const NUM_STUDENTS = 200;
const NUM_MENTORS = 50;

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
];

export async function runUsersSeeder() {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    logger.info("Seeding Users & Mentors...");

    // 1. Fetch valid education nodes (CLASS, COURSE, EXAM)
    const nodesRes = await client.query(`
      SELECT id FROM education_nodes 
      WHERE node_type IN ('CLASS', 'COURSE', 'EXAM')
    `);
    
    if (nodesRes.rows.length === 0) {
      throw new Error("No education nodes found. Please run db:seed:education first.");
    }
    const nodeIds = nodesRes.rows.map(r => r.id);

    // Helper to get random items
    const getRandomNodes = (count: number) => {
      const shuffled = [...nodeIds].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };

    const getRandomState = () => STATES[Math.floor(Math.random() * STATES.length)];

    const createDummyUser = async (role: 'student' | 'mentor') => {
      const email = faker.internet.email().toLowerCase();
      const name = faker.person.fullName();
      const state = getRandomState();
      const bio = faker.person.bio();
      
      // Insert User
      const userRes = await client.query(`
        INSERT INTO users (email, role, onboarding_completed)
        VALUES ($1, $2, true)
        RETURNING id
      `, [email, role]);
      
      const userId = userRes.rows[0].id;

      // Insert Profile
      await client.query(`
        INSERT INTO profiles (user_id, full_name, state, bio, age, gender)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId, 
        name, 
        state, 
        bio, 
        Math.floor(Math.random() * 10) + 15, // Age 15-25
        Math.random() > 0.5 ? 'male' : 'female'
      ]);

      // Assign Random Education Nodes (1 to 3 nodes)
      const randomNodes = getRandomNodes(Math.floor(Math.random() * 3) + 1);
      for (const nodeId of randomNodes) {
        await client.query(`
          INSERT INTO user_education_nodes (user_id, node_id)
          VALUES ($1, $2)
        `, [userId, nodeId]);
      }

      // If mentor, insert mentor profile
      if (role === 'mentor') {
        await client.query(`
          INSERT INTO mentors (user_id, company_name, job_title, linkedin_url, is_verified)
          VALUES ($1, $2, $3, $4, true)
        `, [
          userId,
          faker.company.name(),
          faker.person.jobTitle(),
          `https://linkedin.com/in/${faker.internet.userName()}`
        ]);
      }
    };

    // 2. Generate Students
    for (let i = 0; i < NUM_STUDENTS; i++) {
      await createDummyUser('student');
    }
    logger.info(`Seeded ${NUM_STUDENTS} dummy students.`);

    // 3. Generate Mentors
    for (let i = 0; i < NUM_MENTORS; i++) {
      await createDummyUser('mentor');
    }
    logger.info(`Seeded ${NUM_MENTORS} dummy mentors.`);

    await client.query("COMMIT");
    logger.info("Users seeding completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ error }, "Failed to seed users.");
    throw error;
  } finally {
    client.release();
  }
}

// Allow running directly
if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
  runUsersSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
