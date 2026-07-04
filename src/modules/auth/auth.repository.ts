import { query, getClient } from "@/config/db";

export class AuthRepository {
  static async getUserByEmail(email: string) {
    const result = await query(
      "SELECT id, email, role, onboarding_completed FROM users WHERE email = $1",
      [email],
    );
    return result.rows[0];
  }

  static async createUser(email: string, role: string = 'student') {
    const insertResult = await query(
      `INSERT INTO users (email, email_verified, role, onboarding_completed) 
       VALUES ($1, true, $2, false) RETURNING id, email, role, onboarding_completed`,
      [email, role],
    );
    return insertResult.rows[0];
  }

  static async markEmailVerified(email: string) {
    await query("UPDATE users SET email_verified = true WHERE email = $1", [email]);
  }

  static async updateUserRole(email: string, role: string) {
    await query("UPDATE users SET role = $1 WHERE email = $2", [role, email]);
  }

  static async updateNotificationToken(userId: string, token: string) {
    await query("UPDATE users SET notification_token = $1 WHERE id = $2", [token, userId]);
  }

  static async getMe(userId: string) {
    const result = await query(
      `SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, 
              p.full_name, p.profile_image, p.age, p.gender, p.state, p.country_id, p.bio, 
              p.strong_in, p.need_help_with, p.study_time, p.looking_for
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId],
    );
    return result.rows[0];
  }

  static async deleteAccount(userId: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      // Remove dependencies with RESTRICT or NO ACTION rules
      await client.query("DELETE FROM mentor_bookings WHERE student_id = $1 OR mentor_id = $1", [userId]);
      await client.query("DELETE FROM message_attachments WHERE uploaded_by = $1", [userId]);
      
      // Delete the user (this cascades to profiles, mentors, user_matches, messages, etc.)
      await client.query("DELETE FROM users WHERE id = $1", [userId]);

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
