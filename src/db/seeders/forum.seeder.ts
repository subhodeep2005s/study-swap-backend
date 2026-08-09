import { getClient } from "../../config/db";
import { logger } from "../../config/logger";
import { fakerEN_IN as faker } from "@faker-js/faker";
import { fileURLToPath } from 'url';

const NUM_POSTS = 100;

export async function runForumSeeder() {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    logger.info("Seeding Anonymous Forum...");

    // 1. Fetch categories
    const categoriesRes = await client.query(`SELECT id, name FROM anonymous_categories`);
    if (categoriesRes.rows.length === 0) {
      throw new Error("No categories found. Please check migrations.");
    }
    const categories = categoriesRes.rows;

    // 2. Fetch users
    const usersRes = await client.query(`SELECT id FROM users LIMIT 100`);
    if (usersRes.rows.length === 0) {
      throw new Error("No users found. Please run db:seed:users first.");
    }
    const users = usersRes.rows;

    // 3. Ensure some anonymous profiles exist
    logger.info("Creating anonymous profiles...");
    const profiles = [];
    for (const user of users) {
      // Create a profile for them if it doesn't exist
      const checkRes = await client.query(`SELECT id FROM anonymous_profiles WHERE user_id = $1`, [user.id]);
      let profileId;
      if (checkRes.rows.length === 0) {
        const displayName = faker.person.firstName() + Math.floor(Math.random() * 1000);
        const insertRes = await client.query(`
          INSERT INTO anonymous_profiles (user_id, display_name)
          VALUES ($1, $2)
          RETURNING id
        `, [user.id, displayName]);
        profileId = insertRes.rows[0].id;
      } else {
        profileId = checkRes.rows[0].id;
      }
      profiles.push(profileId);
    }

    // 4. Create 100 posts
    logger.info(`Creating ${NUM_POSTS} forum posts...`);
    const postTypes = ['STORY', 'QUESTION', 'RANT', 'ADVICE', 'DISCUSSION'];

    for (let i = 0; i < NUM_POSTS; i++) {
      const profileId = faker.helpers.arrayElement(profiles);
      const categoryId = faker.helpers.arrayElement(categories).id;
      const type = faker.helpers.arrayElement(postTypes);
      const title = faker.lorem.sentence({ min: 3, max: 10 });
      const content = faker.lorem.paragraphs({ min: 1, max: 3 });

      const postRes = await client.query(`
        INSERT INTO anonymous_posts (anonymous_profile_id, category_id, type, title, content, status)
        VALUES ($1, $2, $3, $4, $5, 'PUBLISHED')
        RETURNING id
      `, [profileId, categoryId, type, title, content]);

      const postId = postRes.rows[0].id;

      // Randomly add media (30% chance)
      if (Math.random() > 0.7) {
        const isVideo = Math.random() > 0.8;
        const mediaUrl = isVideo ? 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4' : faker.image.urlLoremFlickr({ category: 'education' });
        const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
        const mediaType = isVideo ? 'VIDEO' : 'IMAGE';
        
        await client.query(`
          INSERT INTO anonymous_post_media (post_id, object_key, url, mime_type, size, type)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [postId, `test-media-${i}`, mediaUrl, mimeType, 1024 * 1024, mediaType]);
      }

      // Randomly add some comments (0 to 5)
      const numComments = Math.floor(Math.random() * 6);
      for (let j = 0; j < numComments; j++) {
        const commenterId = faker.helpers.arrayElement(profiles);
        await client.query(`
          INSERT INTO anonymous_comments (post_id, anonymous_profile_id, content)
          VALUES ($1, $2, $3)
        `, [postId, commenterId, faker.lorem.sentences({ min: 1, max: 2 })]);
      }
    }

    await client.query("COMMIT");
    logger.info("Forum seeding completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ error }, "Failed to seed forum.");
    throw error;
  } finally {
    client.release();
  }
}

// @ts-ignore
if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
  runForumSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
