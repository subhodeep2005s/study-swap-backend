import { Event, eventEmitter } from "@/config/event";
import { sendMail } from "@/config/resend";
import { logger } from "@/config/logger";
import { query } from "@/config/db";
import {
  bookingConfirmationEmailTemplate,
  mentorRegistrationAdminTemplate,
  mentorVerifiedTemplate,
} from "@/core/utils/email-templates";

export function mentorSubscribers() {
  eventEmitter.on(Event.MENTOR_REGISTERED, async (payload) => {
    try {
      const { email, name, phoneNumber } = payload;
      const adminEmail = "sarkarsubhodeep417@gmail.com";
      
      const html = mentorRegistrationAdminTemplate({
        mentorName: name,
        email,
        phoneNumber,
      });

      await sendMail({
        to: adminEmail,
        subject: "New Mentor Registration - Action Required",
        html,
      });
    } catch (error) {
      logger.error({ error, payload }, "Failed to process mentor registered event");
    }
  });

  eventEmitter.on(Event.MENTOR_VERIFIED, async (payload) => {
    try {
      const { email, name } = payload;
      
      const html = mentorVerifiedTemplate({
        mentorName: name,
      });

      await sendMail({
        to: email,
        subject: "Your Mentor Profile is Approved! 🎉",
        html,
      });
    } catch (error) {
      logger.error({ error, payload }, "Failed to process mentor verified event");
    }
  });

  eventEmitter.on(Event.MENTOR_SESSION_BOOKED, async (payload) => {
    try {
      const { studentId, bookingId } = payload;

      const result = await query(
        `
        SELECT 
          b.meeting_link,
          p.title as plan_title, p.duration_minutes,
          s.start_time, s.end_time,
          student_u.email as student_email, student_prof.full_name as student_name,
          mentor_u.email as mentor_email, mentor_prof.full_name as mentor_name
        FROM mentor_bookings b
        JOIN mentor_plans p ON p.id = b.plan_id
        JOIN mentor_slots s ON s.id = b.slot_id
        JOIN users student_u ON student_u.id = b.student_id
        JOIN profiles student_prof ON student_prof.user_id = student_u.id
        JOIN mentors m ON m.id = b.mentor_id
        JOIN users mentor_u ON mentor_u.id = m.user_id
        JOIN profiles mentor_prof ON mentor_prof.user_id = mentor_u.id
        WHERE b.id = $1 AND b.student_id = $2
      `,
        [bookingId, studentId]
      );

      if (result.rows.length === 0) {
        logger.error({ bookingId }, "Booking not found for email notification");
        return;
      }

      const booking = result.rows[0]!;

      const studentHtml = bookingConfirmationEmailTemplate({
        recipientRole: "student",
        recipientName: booking.student_name,
        studentName: booking.student_name,
        mentorName: booking.mentor_name,
        planTitle: booking.plan_title,
        startTime: booking.start_time,
        durationMinutes: booking.duration_minutes,
        meetingLink: booking.meeting_link,
      });

      const mentorHtml = bookingConfirmationEmailTemplate({
        recipientRole: "mentor",
        recipientName: booking.mentor_name,
        studentName: booking.student_name,
        mentorName: booking.mentor_name,
        planTitle: booking.plan_title,
        startTime: booking.start_time,
        durationMinutes: booking.duration_minutes,
        meetingLink: booking.meeting_link,
      });

      // Fire and forget
      Promise.all([
        sendMail({
          to: booking.student_email,
          subject: "Your Mentoring Session is Confirmed!",
          html: studentHtml,
        }),
        sendMail({
          to: booking.mentor_email,
          subject: "You have a new mentoring booking!",
          html: mentorHtml,
        })
      ]).catch(err => logger.error({ err }, "Failed to send booking emails"));

    } catch (error) {
      logger.error({ error, payload }, "Failed to process mentor session booked event");
    }
  });
}
