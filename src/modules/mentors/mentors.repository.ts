import { query, getClient } from "@/config/db";
import { AppError } from "@/core/errors/AppError";
import { NotificationService } from "@/modules/notifications/notification.service";
import type { PoolClient } from "pg";

export class MentorsRepository {
  static async getVerifiedMentors() {
    const result = await query(`
      SELECT 
        m.id, m.title, m.qualification, m.experience_years, 
        m.hourly_price, m.rating, m.total_reviews, m.is_verified,
        p.full_name, p.profile_image, p.bio
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      WHERE m.is_verified = true
    `);
    return result.rows;
  }

  static async getMentorsByMyExams(userId: string) {
    const result = await query(`
      SELECT DISTINCT
        m.id, m.title, m.qualification, m.experience_years, 
        m.hourly_price, m.rating, m.total_reviews, m.is_verified,
        p.full_name, p.profile_image, p.bio
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      JOIN user_exams mentor_ue ON mentor_ue.user_id = m.user_id
      JOIN user_exams student_ue ON student_ue.exam_id = mentor_ue.exam_id
      WHERE m.is_verified = true AND student_ue.user_id = $1
    `, [userId]);
    return result.rows;
  }

  static async getMentor(id: string) {
    const result = await query(`
      SELECT 
        m.id, m.title, m.qualification, m.experience_years, 
        m.hourly_price, m.rating, m.total_reviews, m.is_verified, m.about,
        p.full_name, p.profile_image, p.bio
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      WHERE m.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async getMentorPlans(mentorId: string) {
    const result = await query(
      `SELECT id, title, description, duration_minutes, price FROM mentor_plans WHERE mentor_id = $1 AND is_active = true ORDER BY price ASC`,
      [mentorId]
    );
    return result.rows;
  }

  static async getMentorSlots(mentorId: string) {
    const result = await query(
      `SELECT id, start_time, end_time FROM mentor_slots WHERE mentor_id = $1 AND is_booked = false AND start_time > NOW() ORDER BY start_time ASC`,
      [mentorId]
    );
    return result.rows;
  }

  static async bookSessionTransaction(studentId: string, mentorId: string, planId: string, slotId: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
  
      // Check mentor exists
      const mentorRes = await client.query("SELECT id FROM mentors WHERE id = $1", [mentorId]);
      if (mentorRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { error: "Mentor not found", code: 404 };
      }
  
      // Check plan exists
      const planRes = await client.query("SELECT price FROM mentor_plans WHERE id = $1 AND mentor_id = $2 AND is_active = true", [planId, mentorId]);
      if (planRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { error: "Plan not found or inactive", code: 404 };
      }
      const price = planRes.rows[0].price;
  
      // Lock slot
      const slotRes = await client.query(
        "SELECT is_booked FROM mentor_slots WHERE id = $1 AND mentor_id = $2 FOR UPDATE",
        [slotId, mentorId]
      );
  
      if (slotRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { error: "Slot not found", code: 404 };
      }
      if (slotRes.rows[0].is_booked) {
        await client.query("ROLLBACK");
        return { error: "Slot is already booked", code: 400 };
      }
  
      // Mark slot as booked
      await client.query("UPDATE mentor_slots SET is_booked = true, updated_at = NOW() WHERE id = $1", [slotId]);
  
      // Create booking
      const insertRes = await client.query(
        `INSERT INTO mentor_bookings (student_id, mentor_id, plan_id, slot_id, status, payment_status, amount)
         VALUES ($1, $2, $3, $4, 'confirmed', 'paid', $5) RETURNING id`,
        [studentId, mentorId, planId, slotId, price]
      );
  
      const bookingId = insertRes.rows[0].id;
      const meetingLink = `https://meet.studyswap.app/${bookingId}`;
  
      await client.query("UPDATE mentor_bookings SET meeting_link = $1 WHERE id = $2", [meetingLink, bookingId]);
  
      // Get mentor's user_id for push notification
      const mentorUserRes = await client.query("SELECT user_id FROM mentors WHERE id = $1", [mentorId]);
      if (mentorUserRes.rows.length > 0) {
        const mentorUserId = mentorUserRes.rows[0].user_id;
        NotificationService.sendToUser(
          mentorUserId,
          "New Booking!",
          "A student has booked a mentoring session with you.",
          { type: "booking_confirmed", bookingId }
        ).catch(err => console.error("Push error", err));
      }

      await client.query("COMMIT");
      return { success: true, bookingId, meetingLink };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async getStudentBookings(studentId: string) {
    const result = await query(`
      SELECT 
        b.id, b.status, b.payment_status, b.amount, b.meeting_link, b.created_at,
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
      
      const bookingRes = await client.query("SELECT slot_id, status FROM mentor_bookings WHERE id = $1 AND student_id = $2 FOR UPDATE", [bookingId, studentId]);
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
