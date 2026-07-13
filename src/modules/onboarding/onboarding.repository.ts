import { query, getClient } from "@/config/db";

export class OnboardingRepository {
  static async upsertProfile(userId: string, fields: [string, unknown][]) {
    if (fields.length === 0) return;

    const columns = fields.map(([column]) => column);
    const values = fields.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 2}`);
    const setClause = fields
      .map(([column], index) => `${column} = $${index + 2}`)
      .join(", ");

    await query(
      `INSERT INTO profiles (user_id, ${columns.join(", ")})
       VALUES ($1, ${placeholders.join(", ")})
       ON CONFLICT (user_id)
       DO UPDATE SET ${setClause}, updated_at = NOW()`,
      [userId, ...values]
    );
  }

  static async getStatus(userId: string) {
    const result = await query("SELECT onboarding_completed FROM users WHERE id = $1", [userId]);
    return result.rows[0];
  }

  static async checkCountryExists(countryId: string) {
    const result = await query("SELECT id FROM countries WHERE id = $1", [countryId]);
    return result.rows.length > 0;
  }

  static async saveCountry(userId: string, countryId: string) {
    await query(
      `INSERT INTO profiles (user_id, country_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id) 
       DO UPDATE SET country_id = EXCLUDED.country_id`,
      [userId, countryId]
    );
  }

  static async getEducationNodes(userId: string) {
    const result = await query(
      `SELECT e.id, e.name 
       FROM user_education_nodes ue 
       JOIN education_nodes e ON ue.node_id = e.id 
       WHERE ue.user_id = $1`,
      [userId]
    );
    return result.rows;
  }

  static async saveEducationNodesTransaction(userId: string, educationNodeIds: string[]) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      // Clear existing nodes for user
      await client.query("DELETE FROM user_education_nodes WHERE user_id = $1", [userId]);
      
      // Insert new nodes
      if (educationNodeIds.length > 0) {
        const placeholders = educationNodeIds.map((_, i) => `($1, $${i + 2})`).join(",");
        await client.query(
          `INSERT INTO user_education_nodes (user_id, node_id) VALUES ${placeholders}`,
          [userId, ...educationNodeIds]
        );
      }
      
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async completeOnboarding(userId: string) {
    await query(
      "UPDATE users SET onboarding_completed = true WHERE id = $1",
      [userId]
    );
  }

  static async applyForMentorTransaction(
    userId: string,
    data: {
      title: string;
      qualification: string;
      experienceYears: number;
      hourlyPrice: number;
      about?: string;
      phoneNumber?: string;
      countryId: string;
      state?: string;
      educationNodeIds: string[];
    }
  ) {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // 1. Upsert into mentors table
      await client.query(
        `INSERT INTO mentors (user_id, title, qualification, experience_years, hourly_price, about, phone_number, is_verified) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, false)
         ON CONFLICT (user_id) DO UPDATE SET 
           title = EXCLUDED.title,
           qualification = EXCLUDED.qualification,
           experience_years = EXCLUDED.experience_years,
           hourly_price = EXCLUDED.hourly_price,
           about = EXCLUDED.about,
           phone_number = EXCLUDED.phone_number,
           is_verified = false,
           updated_at = NOW()`,
        [userId, data.title, data.qualification, data.experienceYears, data.hourlyPrice, data.about || null, data.phoneNumber || null]
      );

      // 2. Update user role
      await client.query(
        `UPDATE users SET role = 'mentor' WHERE id = $1`,
        [userId]
      );

      // 3. Upsert profiles table for country and state
      await client.query(
        `INSERT INTO profiles (user_id, country_id, state)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           country_id = EXCLUDED.country_id,
           state = EXCLUDED.state,
           updated_at = NOW()`,
        [userId, data.countryId, data.state || null]
      );

      // 4. Save education nodes
      await client.query("DELETE FROM user_education_nodes WHERE user_id = $1", [userId]);
      if (data.educationNodeIds && data.educationNodeIds.length > 0) {
        const placeholders = data.educationNodeIds.map((_, i) => `($1, $${i + 2})`).join(",");
        await client.query(
          `INSERT INTO user_education_nodes (user_id, node_id) VALUES ${placeholders}`,
          [userId, ...data.educationNodeIds]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
