import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getClient } from "../../config/db";
import { logger } from "../../config/logger";
import { fakerEN_IN as faker } from "@faker-js/faker";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, s3BucketName } from "../../config/s3";
import { ThumbnailService } from "../../modules/notes/thumbnail.service";

export async function runForumsNotesSeeder() {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    logger.info("Seeding Forums and Notes...");

    // Get 5 mentors and 5 students
    const usersRes = await client.query(`SELECT id, role FROM users LIMIT 20`);
    if (usersRes.rows.length === 0) {
      throw new Error("No users found. Run db:seed:users first.");
    }
    const users = usersRes.rows;

    // Get 1 Exam
    const examRes = await client.query(`SELECT id FROM education_nodes WHERE node_type = 'EXAM' LIMIT 1`);
    const examId = examRes.rows.length > 0 ? examRes.rows[0].id : null;
    
    const countryRes = await client.query(`SELECT id FROM countries WHERE name = 'India' LIMIT 1`);
    const countryId = countryRes.rows.length > 0 ? countryRes.rows[0].id : null;

    // --- 1. SEED FORUMS ---
    logger.info("Seeding Forums...");
    const catRes = await client.query(`SELECT id FROM anonymous_categories LIMIT 1`);
    const catId = catRes.rows[0]?.id;
    if (!catId) throw new Error("No categories found");

    for (let i = 0; i < 15; i++) {
      const u = users[Math.floor(Math.random() * users.length)];
      
      // Ensure profile exists for this user in anonymous_profiles
      await client.query(`
        INSERT INTO anonymous_profiles (user_id, display_name, avatar_url) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id) DO NOTHING
      `, [u.id, faker.internet.username() + Math.floor(Math.random() * 1000), 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.id]);

      const profRes = await client.query(`SELECT id FROM anonymous_profiles WHERE user_id = $1`, [u.id]);
      const profId = profRes.rows[0].id;

      await client.query(`
        INSERT INTO anonymous_posts (title, content, category_id, anonymous_profile_id)
        VALUES ($1, $2, $3, $4)
      `, [
        faker.lorem.sentence(),
        faker.lorem.paragraphs(2),
        catId,
        profId
      ]);
    }
    logger.info("Seeded 15 forum posts.");

    // --- 2. SEED NOTES ---
    logger.info("Deleting old notes...");
    await client.query("DELETE FROM notes");
    logger.info("Seeding 50 Notes with test_media...");
    const testMediaDir = path.resolve(process.cwd(), "test_media");
    if (!fs.existsSync(testMediaDir)) {
      throw new Error(`test_media directory not found at ${testMediaDir}`);
    }

    const files = ['launchecommerce.pdf'];

    if (files.length === 0) {
      throw new Error(`No PDF files found in test_media`);
    }

    for (let i = 0; i < 20; i++) {
      const file = files[Math.floor(Math.random() * files.length)] as string;
      const filePath = path.join(testMediaDir, file);
      const stat = fs.statSync(filePath);

      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(file).replace(".", "");
      let mimeType = "application/pdf";
      let noteType = "LECTURE_NOTES";

      const u = users[Math.floor(Math.random() * users.length)];
      const uniqueId = crypto.randomBytes(8).toString("hex");
      const key = `notes/${u.id}/${uniqueId}.${ext}`;

      logger.info(`Uploading ${file} to S3 as ${key}...`);
      await s3Client.send(new PutObjectCommand({
        Bucket: s3BucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }));

      const hash = crypto.createHash('sha256').update(buffer).update(i.toString()).digest('hex');

      let thumbnailKey: string | null = null;
      try {
        thumbnailKey = await ThumbnailService.generateAndUploadThumbnail(key, mimeType, u.id);
      } catch (e) {
        logger.error(`Thumbnail generation failed for ${key}`);
      }

      const noteRes = await client.query(`
        INSERT INTO notes (
          title, description, note_type,
          country_id,
          uploader_id, uploader_role,
          file_key, thumbnail_key, mime_type, file_size, file_hash,
          status
        ) VALUES (
          $1, $2, $3,
          $4,
          $5, $6,
          $7, $8, $9, $10, $11,
          'PUBLISHED'
        ) RETURNING id
      `, [
        faker.lorem.words(3),
        faker.lorem.paragraph(),
        noteType,
        countryId,
        u.id,
        u.role,
        key,
        thumbnailKey,
        mimeType,
        stat.size,
        hash
      ]);

      if (examId) {
        await client.query(`
          INSERT INTO note_education_nodes (note_id, education_node_id)
          VALUES ($1, $2)
        `, [noteRes.rows[0].id, examId]);
      }
    }
    logger.info(`Seeded 20 notes.`);

    await client.query("COMMIT");
    logger.info("Forums and Notes seeding completed successfully.");
    process.exit(0);
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error seeding forums/notes:");
    console.error(error);
    process.exit(1);
  }
}

runForumsNotesSeeder();
