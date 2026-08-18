import crypto from "crypto";
import { getClient } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";

export async function updateAllProfilePictures() {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    // Fetch all users with role 'student' or 'mentor'
    const usersRes = await client.query(`
      SELECT u.id, u.role, p.user_id as profile_user_id
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role IN ('student', 'mentor')
    `);

    logger.info(`Found ${usersRes.rows.length} students/mentors to update.`);

    let studentsCount = 0;
    let mentorsCount = 0;

    for (const user of usersRes.rows) {
      const randomHex = crypto.randomBytes(10).toString("hex");
      const avatarUrl = `https://i.pravatar.cc/500?u=${randomHex}`;

      if (user.profile_user_id) {
        await client.query(`
          UPDATE profiles 
          SET profile_image = $1, updated_at = NOW()
          WHERE user_id = $2
        `, [avatarUrl, user.id]);
      } else {
        await client.query(`
          INSERT INTO profiles (user_id, profile_image)
          VALUES ($1, $2)
        `, [user.id, avatarUrl]);
      }

      if (user.role === "student") {
        studentsCount++;
      } else if (user.role === "mentor") {
        mentorsCount++;
      }
    }

    await client.query("COMMIT");
    logger.info(`Successfully updated profile pictures: ${studentsCount} students, ${mentorsCount} mentors (Total: ${usersRes.rows.length}).`);
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ error }, "Failed to update profile pictures.");
    throw error;
  } finally {
    client.release();
  }
}

updateAllProfilePictures()
  .then(() => {
    console.log("Profile pictures update complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error updating profile pictures:", err);
    process.exit(1);
  });
