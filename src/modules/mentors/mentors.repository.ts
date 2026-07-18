import { query, getClient } from "@/config/db";
import { AppError } from "@/core/errors/AppError";
import { NotificationService } from "@/modules/notifications/notification.service";
import type { PoolClient } from "pg";

export class MentorsRepository {
  static async getVerifiedMentors(cursorId?: string, limit: number = 10) {
    let sql = `
      SELECT 
        m.id, m.title, m.qualification, m.experience_years, 
        m.hourly_price, m.rating, m.total_reviews, m.is_verified,
        p.full_name, p.profile_image, p.bio, p.country_id, p.state
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      WHERE m.is_verified = true
      AND EXISTS (SELECT 1 FROM mentor_plans mp WHERE mp.mentor_id = m.id AND mp.is_active = true)
      AND EXISTS (SELECT 1 FROM mentor_availability ma WHERE ma.mentor_id = m.id)
    `;

    const params: any[] = [];

    if (cursorId) {
      params.push(cursorId);
      sql += ` AND m.id < $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY m.id DESC LIMIT $${params.length}`;

    const result = await query(sql, params);
    return result.rows;
  }

  static async getMentorsByMyEducationNodes(userId: string) {
    const result = await query(`
      SELECT DISTINCT
        m.id, m.title, m.qualification, m.experience_years, 
        m.hourly_price, m.rating, m.total_reviews, m.is_verified,
        p.full_name, p.profile_image, p.bio, p.country_id, p.state
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      JOIN user_education_nodes mentor_ue ON mentor_ue.user_id = m.user_id
      JOIN user_education_nodes student_ue ON student_ue.node_id = mentor_ue.node_id
      WHERE m.is_verified = true AND student_ue.user_id = $1
      AND EXISTS (SELECT 1 FROM mentor_plans mp WHERE mp.mentor_id = m.id AND mp.is_active = true)
      AND EXISTS (SELECT 1 FROM mentor_availability ma WHERE ma.mentor_id = m.id)
    `, [userId]);
    return result.rows;
  }

  static async getMentor(id: string) {
    const result = await query(`
      SELECT 
        m.id, m.user_id, m.title, m.qualification, m.experience_years, 
        m.hourly_price, m.rating, m.total_reviews, m.is_verified, m.about,
        p.full_name, p.profile_image, p.bio, p.country_id, p.state
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      WHERE m.id = $1
    `, [id]);
    const mentor = result.rows[0];
    if (!mentor) return null;

    // Fetch education nodes
    const educationNodesResult = await query(`
      SELECT e.id, e.name 
      FROM user_education_nodes ue
      JOIN education_nodes e ON e.id = ue.node_id
      WHERE ue.user_id = $1
    `, [mentor.user_id]);
    mentor.educationNodes = educationNodesResult.rows;

    return mentor;
  }

  static async getMentorPlans(mentorId: string) {
    const result = await query(
      `SELECT id, title, description, duration_minutes, price FROM mentor_plans WHERE mentor_id = $1 AND is_active = true ORDER BY price ASC`,
      [mentorId]
    );
    return result.rows;
  }

  static async getMentorPlan(planId: string) {
    const result = await query(`SELECT duration_minutes, is_active FROM mentor_plans WHERE id = $1`, [planId]);
    return result.rows[0];
  }

  static async getAvailabilityForDay(mentorId: string, dayOfWeek: number) {
    const result = await query(
      `SELECT start_time, end_time FROM mentor_availability WHERE mentor_id = $1 AND day_of_week = $2 ORDER BY start_time ASC`,
      [mentorId, dayOfWeek]
    );
    return result.rows;
  }

  static async getBookingsForDate(mentorId: string, dateStart: string, dateEnd: string) {
    const result = await query(
      `SELECT s.start_time, s.end_time FROM mentor_bookings b
       JOIN mentor_slots s ON s.id = b.slot_id
       WHERE b.mentor_id = $1 AND b.status IN ('confirmed', 'pending') 
       AND s.start_time >= $2 AND s.start_time < $3`,
      [mentorId, dateStart, dateEnd]
    );
    return result.rows;
  }

  static async bookSessionTransaction(studentId: string, mentorId: string, planId: string, slotId: string, slotStartTime: string, slotEndTime: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
  
      // Lock mentor row to prevent concurrent booking overlaps for the same mentor
      const mentorRes = await client.query("SELECT user_id FROM mentors WHERE id = $1 FOR UPDATE", [mentorId]);
      if (mentorRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { error: "Mentor not found", code: 404 };
      }
      const mentorUserId = mentorRes.rows[0].user_id;
  
      // Check plan exists
      const planRes = await client.query("SELECT price FROM mentor_plans WHERE id = $1 AND mentor_id = $2 AND is_active = true", [planId, mentorId]);
      if (planRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { error: "Plan not found or inactive", code: 404 };
      }
      const price = planRes.rows[0].price;
  
      // Check for overlap across bookings
      const overlapRes = await client.query(
        `SELECT b.id FROM mentor_bookings b
         JOIN mentor_slots s ON s.id = b.slot_id
         WHERE b.mentor_id = $1 AND b.status IN ('confirmed', 'pending') 
         AND s.start_time < $3 AND s.end_time > $2`,
        [mentorId, slotStartTime, slotEndTime]
      );
      if (overlapRes.rows.length > 0) {
        await client.query("ROLLBACK");
        return { error: "Slot overlaps with an existing booking", code: 400 };
      }
  
      // Insert just-in-time slot
      await client.query(
        `INSERT INTO mentor_slots (id, mentor_id, start_time, end_time, is_booked)
         VALUES ($1, $2, $3, $4, true)`,
        [slotId, mentorId, slotStartTime, slotEndTime]
      );
  
      // Create booking
      const insertBookingRes = await client.query(
        `INSERT INTO mentor_bookings (student_id, mentor_id, plan_id, slot_id, status, payment_status, amount)
         VALUES ($1, $2, $3, $4, 'confirmed', 'paid', $5) RETURNING id`,
        [studentId, mentorId, planId, slotId, price]
      );
  
      const bookingId = insertBookingRes.rows[0].id;
  
      if (mentorUserId) {
        NotificationService.sendToUser(
          mentorUserId,
          "New Booking!",
          "A student has booked a mentoring session with you.",
          { type: "booking_confirmed", bookingId }
        ).catch(err => console.error("Push error", err));
      }

      await client.query("COMMIT");
      return { success: true, bookingId, slotStartTime, slotEndTime, mentorUserId, planDuration: null };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateBookingMeetingDetails(
    bookingId: string,
    googleEventId: string,
    googleMeetUrl: string,
    googleCalendarUrl: string
  ) {
    await query(
      `UPDATE mentor_bookings 
       SET google_event_id = $2, google_meet_url = $3, google_calendar_url = $4, meeting_link = $3, updated_at = NOW()
       WHERE id = $1`,
      [bookingId, googleEventId, googleMeetUrl, googleCalendarUrl]
    );
  }

  static async getStudentBookings(studentId: string) {
    const result = await query(`
      SELECT 
        b.id, b.status, b.payment_status, b.amount, b.meeting_link, b.created_at,
        b.google_meet_url, b.google_calendar_url, b.meeting_provider,
        p.title as plan_title, p.duration_minutes,
        s.start_time, s.end_time,
        m.title as mentor_title,
        prof.full_name as mentor_name, prof.profile_image as mentor_image
      FROM mentor_bookings b
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN mentors m ON m.id = b.mentor_id
      JOIN profiles prof ON prof.user_id = m.user_id
      WHERE b.student_id = $1
      ORDER BY s.start_time DESC
    `, [studentId]);
    return result.rows;
  }

  static async getStudentBooking(studentId: string, bookingId: string) {
    const result = await query(`
      SELECT 
        b.id, b.status, b.payment_status, b.amount, b.meeting_link, b.created_at,
        b.google_meet_url, b.google_calendar_url, b.meeting_provider,
        p.title as plan_title, p.duration_minutes,
        s.start_time, s.end_time,
        m.title as mentor_title,
        prof.full_name as mentor_name, prof.profile_image as mentor_image
      FROM mentor_bookings b
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN mentors m ON m.id = b.mentor_id
      JOIN profiles prof ON prof.user_id = m.user_id
      WHERE b.student_id = $1 AND b.id = $2
    `, [studentId, bookingId]);
    return result.rows[0];
  }

  static async cancelBookingTransaction(studentId: string, bookingId: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const bookingRes = await client.query("SELECT slot_id, status, google_event_id FROM mentor_bookings WHERE id = $1 AND student_id = $2 FOR UPDATE", [bookingId, studentId]);
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
      return { success: true, googleEventId: booking.google_event_id };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
