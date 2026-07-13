import { query, getClient } from "@/config/db";
import type { PoolClient } from "pg";

export class MentorBookingsRepository {
  static async ensureMentor(userId: string) {
    const result = await query("SELECT id FROM mentors WHERE user_id = $1", [userId]);
    if (result.rows.length === 0) {
      const insertRes = await query("INSERT INTO mentors (user_id) VALUES ($1) RETURNING id", [userId]);
      return insertRes.rows[0]!.id;
    }
    return result.rows[0]!.id;
  }

  static async getMentorProfile(mentorId: string) {
    const result = await query(`
      SELECT 
        m.*, 
        p.full_name, p.profile_image, p.country_id, p.state,
        u.email
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      JOIN users u ON u.id = m.user_id
      WHERE m.id = $1
    `, [mentorId]);
    const mentor = result.rows[0];
    if (!mentor) return null;

    // Fetch education nodes
    const educationNodesResult = await query(`
      SELECT en.id, en.name 
      FROM user_education_nodes uen
      JOIN education_nodes en ON en.id = uen.node_id
      WHERE uen.user_id = $1
    `, [mentor.user_id]);
    mentor.educationNodes = educationNodesResult.rows;

    return mentor;
  }

  static async updateMentorProfile(mentorId: string, fields: string[], values: any[]) {
    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      values.push(mentorId);
      
      await query(`
        UPDATE mentors SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *
      `, values);
    }
    
    return await this.getMentorProfile(mentorId);
  }

  static async getPlans(mentorId: string) {
    const result = await query("SELECT * FROM mentor_plans WHERE mentor_id = $1 ORDER BY created_at DESC", [mentorId]);
    return result.rows;
  }

  static async createPlan(mentorId: string, data: any) {
    const result = await query(
      `INSERT INTO mentor_plans (mentor_id, title, description, duration_minutes, price, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [mentorId, data.title, data.description, data.duration_minutes, data.price, data.is_active ?? true]
    );
    return result.rows[0];
  }

  static async updatePlan(planId: string, mentorId: string, fields: string[], values: any[]) {
    fields.push(`updated_at = NOW()`);
    values.push(planId, mentorId);
    
    const result = await query(
      `UPDATE mentor_plans SET ${fields.join(", ")} WHERE id = $${values.length - 1} AND mentor_id = $${values.length} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async deletePlan(planId: string, mentorId: string) {
    const result = await query("DELETE FROM mentor_plans WHERE id = $1 AND mentor_id = $2 RETURNING id", [planId, mentorId]);
    return result.rows.length > 0;
  }

  static async getAvailability(mentorId: string) {
    const result = await query(
      `SELECT day_of_week, start_time, end_time FROM mentor_availability WHERE mentor_id = $1 ORDER BY day_of_week, start_time`,
      [mentorId]
    );
    return result.rows;
  }

  static async updateAvailabilityTransaction(mentorId: string, availability: { day_of_week: number, start_time: string, end_time: string }[]) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      await client.query("DELETE FROM mentor_availability WHERE mentor_id = $1", [mentorId]);
      
      for (const rule of availability) {
        if (rule.start_time >= rule.end_time) {
          await client.query("ROLLBACK");
          throw new Error(`Start time must be before end time: ${rule.start_time} - ${rule.end_time}`);
        }
        await client.query(
          "INSERT INTO mentor_availability (mentor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)",
          [mentorId, rule.day_of_week, rule.start_time, rule.end_time]
        );
      }
      
      await client.query("COMMIT");
      return await this.getAvailability(mentorId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async getBookings(mentorId: string) {
    const result = await query(`
      SELECT 
        b.id, b.status, b.payment_status, b.amount, b.meeting_link, b.created_at,
        p.title as plan_title, p.duration_minutes,
        s.start_time, s.end_time,
        u.email as student_email, prof.full_name as student_name, prof.profile_image as student_image
      FROM mentor_bookings b
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN users u ON u.id = b.student_id
      JOIN profiles prof ON prof.user_id = u.id
      WHERE b.mentor_id = $1
      ORDER BY s.start_time DESC
    `, [mentorId]);
    return result.rows;
  }

  static async getBooking(bookingId: string, mentorId: string) {
    const result = await query(`
      SELECT 
        b.id, b.status, b.payment_status, b.amount, b.meeting_link, b.created_at,
        p.title as plan_title, p.duration_minutes,
        s.start_time, s.end_time,
        u.email as student_email, prof.full_name as student_name, prof.profile_image as student_image
      FROM mentor_bookings b
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN users u ON u.id = b.student_id
      JOIN profiles prof ON prof.user_id = u.id
      WHERE b.mentor_id = $1 AND b.id = $2
    `, [mentorId, bookingId]);
    return result.rows[0];
  }

  static async updateBookingStatus(bookingId: string, mentorId: string, status: string) {
    const result = await query(
      "UPDATE mentor_bookings SET status = $1, updated_at = NOW() WHERE id = $2 AND mentor_id = $3 RETURNING *",
      [status, bookingId, mentorId]
    );
    return result.rows[0];
  }

  static async cancelMentorBookingTransaction(bookingId: string, mentorId: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const bookingRes = await client.query("SELECT slot_id, status FROM mentor_bookings WHERE id = $1 AND mentor_id = $2 FOR UPDATE", [bookingId, mentorId]);
      if (bookingRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { error: "Booking not found", code: 404 };
      }
      
      const booking = bookingRes.rows[0];
      if (booking.status === 'cancelled') {
        await client.query("ROLLBACK");
        return { error: "Booking is already cancelled", code: 400 };
      }
      if (booking.status === 'completed') {
        await client.query("ROLLBACK");
        return { error: "Cannot cancel a completed booking", code: 400 };
      }
      
      // Free slot
      await client.query("UPDATE mentor_slots SET is_booked = false WHERE id = $1", [booking.slot_id]);
      
      // Cancel booking
      await client.query("UPDATE mentor_bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [bookingId]);
      
      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
