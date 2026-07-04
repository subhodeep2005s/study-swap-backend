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
    const result = await query("SELECT * FROM mentors WHERE id = $1", [mentorId]);
    return result.rows[0];
  }

  static async updateMentorProfile(mentorId: string, fields: string[], values: any[]) {
    if (fields.length === 0) return await this.getMentorProfile(mentorId);
    
    fields.push(`updated_at = NOW()`);
    values.push(mentorId);
    
    const result = await query(`
      UPDATE mentors SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *
    `, values);
    
    return result.rows[0];
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

  static async getSlots(mentorId: string) {
    const result = await query("SELECT * FROM mentor_slots WHERE mentor_id = $1 ORDER BY start_time ASC", [mentorId]);
    return result.rows;
  }

  static async createSlot(mentorId: string, data: { start_time: string, end_time: string }) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const overlapRes = await client.query(
        "SELECT id FROM mentor_slots WHERE mentor_id = $1 AND start_time < $3 AND end_time > $2 FOR UPDATE",
        [mentorId, data.start_time, data.end_time]
      );
      
      if (overlapRes.rows.length > 0) {
        await client.query("ROLLBACK");
        return { error: "Slot overlaps with an existing slot", code: 400 };
      }

      const result = await client.query(
        `INSERT INTO mentor_slots (mentor_id, start_time, end_time, is_booked)
         VALUES ($1, $2, $3, false) RETURNING *`,
        [mentorId, data.start_time, data.end_time]
      );
      
      await client.query("COMMIT");
      return { success: true, slot: result.rows[0] };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateSlotTransaction(slotId: string, mentorId: string, fields: string[], values: any[]) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const slotRes = await client.query("SELECT is_booked, start_time, end_time FROM mentor_slots WHERE id = $1 AND mentor_id = $2 FOR UPDATE", [slotId, mentorId]);
      if (slotRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { error: "Slot not found", code: 404 };
      }
      if (slotRes.rows[0]!.is_booked) {
        await client.query("ROLLBACK");
        return { error: "Cannot modify a booked slot", code: 400 };
      }
  
      fields.push(`updated_at = NOW()`);
      values.push(slotId, mentorId);
      
      const result = await client.query(
        `UPDATE mentor_slots SET ${fields.join(", ")} WHERE id = $${values.length - 1} AND mentor_id = $${values.length} RETURNING *`,
        values
      );
      
      if (new Date(result.rows[0]!.start_time) >= new Date(result.rows[0]!.end_time)) {
        await client.query("ROLLBACK");
        return { error: "End time must be after start time", code: 400 };
      }

      const overlapRes = await client.query(
        "SELECT id FROM mentor_slots WHERE mentor_id = $1 AND start_time < $3 AND end_time > $2 AND id != $4 FOR UPDATE",
        [mentorId, result.rows[0]!.start_time, result.rows[0]!.end_time, slotId]
      );
      
      if (overlapRes.rows.length > 0) {
        await client.query("ROLLBACK");
        return { error: "Updated slot overlaps with an existing slot", code: 400 };
      }
      
      await client.query("COMMIT");
      return { success: true, slot: result.rows[0] };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  static async getSlot(slotId: string, mentorId: string) {
    const result = await query("SELECT is_booked FROM mentor_slots WHERE id = $1 AND mentor_id = $2", [slotId, mentorId]);
    return result.rows[0];
  }

  static async deleteSlot(slotId: string) {
    await query("DELETE FROM mentor_slots WHERE id = $1", [slotId]);
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
