import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getClient } from "../../config/db";
import { logger } from "../../config/logger";
import { fakerEN_IN as faker } from "@faker-js/faker";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, s3BucketName } from "../../config/s3";
import { 
  HallOfFameAchievementType, 
  HallOfFameMediaType, 
  HallOfFameStatus 
} from "../../modules/hall-of-fame/hall-of-fame.types";

const achievementTypes: HallOfFameAchievementType[] = [
  'EXAM_CLEARED',
  'SCORE_IMPROVEMENT',
  'COLLEGE_ADMISSION',
  'JOB_PLACEMENT',
  'RANK_ACHIEVEMENT',
  'ACADEMIC_ACHIEVEMENT',
  'COMPETITION_ACHIEVEMENT',
  'CERTIFICATION',
  'SCHOLARSHIP',
  'COMEBACK',
  'CONSISTENCY',
  'OTHER'
];

export async function runHallOfFameSeeder() {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    logger.info("Seeding Hall of Fame...");

    // Get an admin user
    const adminRes = await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (adminRes.rows.length === 0) {
      throw new Error("No admin user found. Run db:seed:users first.");
    }
    const adminId = adminRes.rows[0].id;

    // Get Indian Country ID
    const countryRes = await client.query(`SELECT id FROM countries WHERE name = 'India' LIMIT 1`);
    if (countryRes.rows.length === 0) {
      throw new Error("India not found in countries table.");
    }
    const countryId = countryRes.rows[0].id;

    // Get a few education nodes (e.g. JEE Main, NEET, etc.)
    const examRes = await client.query(`SELECT id FROM education_nodes WHERE country_id = $1 LIMIT 5`, [countryId]);
    if (examRes.rows.length === 0) {
      throw new Error("No education nodes found for India.");
    }
    const educationNodes = examRes.rows.map(r => r.id);

    // Read images from test_media
    const testMediaDir = path.resolve(process.cwd(), "test_media");
    if (!fs.existsSync(testMediaDir)) {
      throw new Error(`test_media directory not found at ${testMediaDir}`);
    }

    const files = fs.readdirSync(testMediaDir).filter(f => f.startsWith('student') || f.startsWith('studnet'));

    if (files.length === 0) {
      throw new Error(`No student images found in test_media`);
    }

    await client.query("DELETE FROM hall_of_fame");

    for (let i = 0; i < 10; i++) {
      // Pick a random image
      const file = files[i % files.length] as string;
      const filePath = path.join(testMediaDir, file);
      
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(file).replace(".", "");
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      
      const uniqueId = crypto.randomBytes(8).toString("hex");
      const key = `hall-of-fame/${uniqueId}.${ext}`;

      logger.info(`Uploading ${file} to S3 as ${key}...`);
      await s3Client.send(new PutObjectCommand({
        Bucket: s3BucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }));

      const isPublished = i < 5 ? true : Math.random() > 0.2;
      const status: HallOfFameStatus = isPublished ? 'PUBLISHED' : 'DRAFT';
      const isFeatured = i < 5;

      const beforeScore = faker.number.int({ min: 40, max: 70 });
      const afterScore = faker.number.int({ min: 85, max: 99 });
      
      const resultBefore = `${beforeScore}%`;
      const resultAfter = `${afterScore}.${faker.number.int({ min: 1, max: 99 })}%`;

      const title = faker.helpers.arrayElement([
        `From ${resultBefore} to ${resultAfter} in just 6 months`,
        `How I cracked JEE Advanced with AIR ${faker.number.int({ min: 100, max: 5000 })}`,
        `My comeback story: ${resultBefore} -> ${resultAfter}`,
        `Accepted into IIT Bombay!`,
        `Score improvement journey`
      ]);

      const storyRes = await client.query(`
        INSERT INTO hall_of_fame (
          title, short_description, story, person_name, person_role,
          achievement_type, achievement_year, result_label, result_before, result_after,
          country_id, media_type, media_key, thumbnail_key, status, is_featured, admin_id,
          published_at, views_count, likes_count, helpful_count, saves_count, comments_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23
        ) RETURNING id
      `, [
        title,
        faker.lorem.sentence(),
        faker.lorem.paragraphs(4),
        faker.person.fullName(),
        'Student',
        faker.helpers.arrayElement(achievementTypes),
        faker.helpers.arrayElement([2023, 2024, 2025, 2026]),
        'Percentile',
        resultBefore,
        resultAfter,
        countryId,
        'IMAGE' as HallOfFameMediaType,
        key,
        key, // using same key as thumbnail for simplicity
        status,
        isFeatured,
        adminId,
        isPublished ? new Date() : null,
        faker.number.int({ min: 10, max: 1000 }), // views
        faker.number.int({ min: 0, max: 200 }),   // likes
        faker.number.int({ min: 0, max: 100 }),   // helpful
        faker.number.int({ min: 0, max: 50 }),    // saves
        0                                         // comments
      ]);

      const storyId = storyRes.rows[0].id;

      // Assign to 1-2 random education nodes
      const numNodes = faker.number.int({ min: 1, max: 2 });
      const shuffledNodes = [...educationNodes].sort(() => 0.5 - Math.random());
      for (let j = 0; j < numNodes; j++) {
        await client.query(`
          INSERT INTO hall_of_fame_education_nodes (hall_of_fame_id, education_node_id)
          VALUES ($1, $2)
        `, [storyId, shuffledNodes[j]]);
      }
    }
    logger.info(`Seeded 10 Hall of Fame stories.`);

    await client.query("COMMIT");
    logger.info("Hall of Fame seeding completed successfully.");
    process.exit(0);
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error seeding Hall of Fame:");
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runHallOfFameSeeder();
