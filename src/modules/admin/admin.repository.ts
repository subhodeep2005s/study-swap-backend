import { query, getClient } from "@/config/db";
import type { PoolClient } from "pg";

type UpdateField = [column: string, value: unknown];

function buildSetClause(fields: UpdateField[], startIndex = 1) {
  return fields.map(([column], index) => `${column} = $${startIndex + index}`).join(", ");
}

export class AdminRepository {
  static async assertUserExists(client: PoolClient, id: string) {
    const result = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [id]);
    if (result.rows.length === 0) return false;
    return true;
  }

  static async upsertProfile(client: PoolClient, userId: string, fields: UpdateField[]) {
    if (fields.length === 0) return;
  
    const columns = fields.map(([column]) => column);
    const values = fields.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 2}`);
    const setClause = buildSetClause(fields, 2);
  
    await client.query(
      `INSERT INTO profiles (user_id, ${columns.join(", ")})
       VALUES ($1, ${placeholders.join(", ")})
       ON CONFLICT (user_id)
       DO UPDATE SET ${setClause}, updated_at = NOW()`,
      [userId, ...values]
    );
  }

  static async upsertMentor(client: PoolClient, userId: string, fields: UpdateField[]) {
    if (fields.length === 0) return;
  
    const columns = fields.map(([column]) => column);
    const values = fields.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 2}`);
    const setClause = buildSetClause(fields, 2);
  
    await client.query(
      `INSERT INTO mentors (user_id, ${columns.join(", ")})
       VALUES ($1, ${placeholders.join(", ")})
       ON CONFLICT (user_id)
       DO UPDATE SET ${setClause}, updated_at = NOW()`,
      [userId, ...values]
    );
  }

  static async getCountries() {
    const result = await query("SELECT * FROM countries ORDER BY created_at DESC");
    return result.rows;
  }

  static async createCountry(name: string, flag: string | null | undefined, isoCode: string | null | undefined) {
    const result = await query(
      "INSERT INTO countries (name, flag, iso_code) VALUES ($1, $2, $3) RETURNING *",
      [name, flag || null, isoCode || null]
    );
    return result.rows[0];
  }

  static async updateCountry(id: string, fields: UpdateField[]) {
    const result = fields.length > 0
        ? await query(
            `UPDATE countries SET ${buildSetClause(fields)}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
            [...fields.map(([, value]) => value), id]
          )
        : await query("SELECT * FROM countries WHERE id = $1", [id]);
    return result.rows[0];
  }

  static async deleteCountry(id: string) {
    const result = await query("DELETE FROM countries WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  static async getExams() {
    const result = await query("SELECT * FROM exams ORDER BY created_at DESC");
    return result.rows;
  }

  static async getExamsByCountry(countryId: string) {
    const result = await query("SELECT * FROM exams WHERE country_id = $1 ORDER BY created_at DESC", [countryId]);
    return result.rows;
  }

  static async createExam(countryId: string | null | undefined, name: string, isActive: boolean) {
    const result = await query(
      "INSERT INTO exams (country_id, name, is_active) VALUES ($1, $2, COALESCE($3, true)) RETURNING *",
      [countryId || null, name, isActive]
    );
    return result.rows[0];
  }

  static async updateExam(id: string, fields: UpdateField[]) {
    const result = fields.length > 0
        ? await query(
            `UPDATE exams SET ${buildSetClause(fields)}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
            [...fields.map(([, value]) => value), id]
          )
        : await query("SELECT * FROM exams WHERE id = $1", [id]);
    return result.rows[0];
  }

  static async deleteExam(id: string) {
    const result = await query("DELETE FROM exams WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  static async getUsers() {
    const result = await query(`
      SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, p.full_name, p.profile_image, p.country_id, p.state, p.gender, p.age
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  }

  static async getStudents() {
    const result = await query(`
      SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, p.full_name, p.profile_image, p.country_id, p.state, p.gender, p.age
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  }

  static async getMentorsUsers() {
    const result = await query(`
      SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, p.full_name, p.profile_image, p.country_id, p.state, p.gender, p.age
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = 'mentor'
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  }

  static async getUserById(id: string) {
    const result = await query(`
      SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, 
             p.full_name, p.profile_image, p.age, p.gender, p.state, p.country_id, p.bio, 
             p.strong_in, p.need_help_with, p.study_time, p.looking_for
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async getAdminMentors() {
    const result = await query(`
      SELECT m.*, p.full_name, p.profile_image, u.email
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      JOIN users u ON u.id = m.user_id
      ORDER BY m.created_at DESC
    `);
    return result.rows;
  }

  static async getAdminMentor(id: string) {
    const result = await query(`
      SELECT m.*, p.full_name, p.profile_image, u.email
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      JOIN users u ON u.id = m.user_id
      WHERE m.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async updateAdminMentor(id: string, fields: string[], values: any[]) {
    fields.push(`updated_at = NOW()`);
    values.push(id);
  
    const result = await query(`
      UPDATE mentors SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *
    `, values);
    return result.rows[0];
  }

  static async deleteAdminMentor(id: string) {
    const result = await query("DELETE FROM mentors WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  static async verifyAdminMentor(id: string) {
    const result = await query("UPDATE mentors SET is_verified = true, updated_at = NOW() WHERE id = $1 RETURNING *", [id]);
    return result.rows[0];
  }

  static async getAdminBookings() {
    const result = await query(`
      SELECT 
        b.*,
        s.start_time, s.end_time,
        p.title as plan_title,
        u.email as student_email,
        prof.full_name as student_name
      FROM mentor_bookings b
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN users u ON u.id = b.student_id
      JOIN profiles prof ON prof.user_id = u.id
      ORDER BY b.created_at DESC
    `);
    return result.rows;
  }

  static async getAdminBooking(id: string) {
    const result = await query(`
      SELECT 
        b.*,
        s.start_time, s.end_time,
        p.title as plan_title,
        u.email as student_email,
        prof.full_name as student_name
      FROM mentor_bookings b
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN users u ON u.id = b.student_id
      JOIN profiles prof ON prof.user_id = u.id
      WHERE b.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async updateAdminBooking(id: string, fields: string[], values: any[]) {
    fields.push(`updated_at = NOW()`);
    values.push(id);
  
    const result = await query(`
      UPDATE mentor_bookings SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *
    `, values);
    return result.rows[0];
  }

  static async deleteAdminBooking(id: string) {
    const result = await query("DELETE FROM mentor_bookings WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  static async updateUserTransaction(id: string, userFields: string[], userValues: unknown[], profileFields: UpdateField[], mentorFields?: UpdateField[]) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const exists = await this.assertUserExists(client, id);
      if (!exists) {
        await client.query("ROLLBACK");
        return { error: "User not found", code: 404 };
      }
      
      if (userFields.length > 0) {
        userFields.push(`updated_at = NOW()`);
        userValues.push(id);
        await client.query(`UPDATE users SET ${userFields.join(", ")} WHERE id = $${userFields.length}`, userValues);
      }
      
      await this.upsertProfile(client, id, profileFields);
      
      if (mentorFields) {
        await this.upsertMentor(client, id, mentorFields);
      }
      
      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteUser(id: string) {
    const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }
}
