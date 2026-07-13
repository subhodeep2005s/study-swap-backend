import { AppError } from "@/core/errors/AppError";
import { randomUUID } from "crypto";
import { Event, eventEmitter } from "@/config/event";
import { redis } from "@/config/redis";
import { logger } from "@/config/logger";
import { query } from "@/config/db";
import { sendMail } from "@/config/resend";
import { MentorsRepository } from "./mentors.repository";
import { GoogleService } from "@/modules/google/google.service";

export async function getMentors() {
  const cacheKey = "cache:mentors:list";
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await MentorsRepository.getVerifiedMentors();
  
  await redis.set(cacheKey, JSON.stringify(result), "EX", 300); // 5 minutes
  return result;
}

export async function getMentorsByMyEducationNodes(userId: string) {
  const cacheKey = `cache:mentors:my-nodes:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await MentorsRepository.getMentorsByMyEducationNodes(userId);
  
  await redis.set(cacheKey, JSON.stringify(result), "EX", 300); // 5 minutes
  return result;
}

export async function getMentor(id: string) {
  const result = await MentorsRepository.getMentor(id);
  if (!result) throw new AppError("Mentor not found", 404);
  return result;
}

export async function getMentorPlans(mentorId: string) {
  return await MentorsRepository.getMentorPlans(mentorId);
}

export async function getMentorSlots(mentorId: string, planId: string, date: string) {
  const requestDate = new Date(date);
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  if (requestDate < now) return [];

  const plan = await MentorsRepository.getMentorPlan(planId);
  if (!plan || !plan.is_active) throw new AppError("Invalid or inactive plan", 400);

  const durationMs = plan.duration_minutes * 60000;
  const dayOfWeek = requestDate.getUTCDay();

  const availability = await MentorsRepository.getAvailabilityForDay(mentorId, dayOfWeek);
  if (availability.length === 0) return [];

  const dateStart = date + "T00:00:00Z";
  const nextDate = new Date(requestDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const dateEnd = nextDate.toISOString();

  const bookings = await MentorsRepository.getBookingsForDate(mentorId, dateStart, dateEnd);

  const generatedSlots = [];

  for (const block of availability) {
    const blockStart = new Date(`${date}T${block.start_time}Z`);
    const blockEnd = new Date(`${date}T${block.end_time}Z`);

    let currentStart = blockStart;
    
    while (currentStart.getTime() + durationMs <= blockEnd.getTime()) {
      const currentEnd = new Date(currentStart.getTime() + durationMs);

      if (currentStart > new Date()) {
        const overlaps = bookings.some((b: any) => {
          const bStart = new Date(b.start_time).getTime();
          const bEnd = new Date(b.end_time).getTime();
          const sStart = currentStart.getTime();
          const sEnd = currentEnd.getTime();
          return (sStart < bEnd && sEnd > bStart);
        });

        if (!overlaps) {
          const id = randomUUID();
          const slot = {
            id,
            mentor_id: mentorId,
            start_time: currentStart.toISOString(),
            end_time: currentEnd.toISOString(),
            is_booked: false
          };
          generatedSlots.push(slot);

          await redis.set(`slot:${id}`, JSON.stringify({
            mentor_id: mentorId,
            start_time: slot.start_time,
            end_time: slot.end_time
          }), "EX", 900);
        }
      }
      currentStart = currentEnd;
    }
  }

  return generatedSlots;
}

export async function bookSession(studentId: string, mentorId: string, planId: string, slotId: string) {
  const cachedSlot = await redis.get(`slot:${slotId}`);
  if (!cachedSlot) {
    throw new AppError("Slot is no longer available or has expired. Please refresh the slots.", 400);
  }

  const slotData = JSON.parse(cachedSlot);
  if (slotData.mentor_id !== mentorId) {
    throw new AppError("Invalid slot for this mentor", 400);
  }

  const result = await MentorsRepository.bookSessionTransaction(studentId, mentorId, planId, slotId, slotData.start_time, slotData.end_time);
  if (result.error) {
    throw new AppError(result.error, result.code);
  }

  // Clear slot from Redis to prevent double booking attempts
  await redis.del(`slot:${slotId}`);

  eventEmitter.emit(Event.MENTOR_SESSION_BOOKED, {
    studentId,
    bookingId: result.bookingId,
  });

  // --- Google Meet + Emails (async, non-blocking) ---
  createMeetingAndNotify(
    result.bookingId!,
    studentId,
    mentorId,
    result.slotStartTime!,
    result.slotEndTime!,
    result.mentorUserId!
  ).catch(err => logger.error({ err, bookingId: result.bookingId }, "Failed in post-booking Google Meet flow"));

  return { bookingId: result.bookingId };
}

/**
 * Creates Google Meet, updates booking, and sends confirmation emails.
 * Runs asynchronously after the booking transaction commits.
 * If Google fails, the booking still exists — meetingStatus remains PENDING.
 */
async function createMeetingAndNotify(
  bookingId: string,
  studentId: string,
  mentorId: string,
  slotStartTime: string,
  slotEndTime: string,
  mentorUserId: string | null
) {
  // 1. Fetch names and emails
  const studentInfo = await query(
    `SELECT u.email, p.full_name FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [studentId]
  );
  const studentEmail = studentInfo.rows[0]?.email;
  const studentName = studentInfo.rows[0]?.full_name || "Student";

  let mentorEmail = "";
  let mentorName = "Mentor";
  if (mentorUserId) {
    const mentorInfo = await query(
      `SELECT u.email, p.full_name FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [mentorUserId]
    );
    mentorEmail = mentorInfo.rows[0]?.email || "";
    mentorName = mentorInfo.rows[0]?.full_name || "Mentor";
  }

  const startDate = new Date(slotStartTime);
  const endDate = new Date(slotEndTime);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  const formattedDate = startDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const formattedTime = startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  // 2. Create Google Meet
  let meetUrl = "";
  let calendarUrl = "";

  if (GoogleService.isConfigured()) {
    try {
      const meetResult = await GoogleService.createMeeting({
        mentorName,
        mentorEmail,
        studentName,
        studentEmail,
        bookingId,
        title: "StudySwap Mentorship Session",
        description: `Booking ID: ${bookingId}\nMentor: ${mentorName}\nStudent: ${studentName}`,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      });

      await MentorsRepository.updateBookingMeetingDetails(
        bookingId,
        meetResult.eventId,
        meetResult.meetUrl,
        meetResult.calendarUrl
      );

      meetUrl = meetResult.meetUrl;
      calendarUrl = meetResult.calendarUrl;

      logger.info({ bookingId, meetUrl }, "Google Meet created and saved for booking");
    } catch (error) {
      logger.error({ error, bookingId }, "Google Meet creation failed — booking remains valid");
    }
  } else {
    logger.warn({ bookingId }, "Google Calendar not configured — skipping Meet creation");
  }

  // 3. Send confirmation emails
  const meetButton = meetUrl
    ? `<a href="${meetUrl}" style="display: inline-block; padding: 12px 24px; background: #4285F4; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">Join Google Meet</a>`
    : `<p style="color: #666;">Meeting link will be available soon.</p>`;

  // Student email
  try {
    await sendMail({
      to: studentEmail,
      subject: "Booking Confirmed — StudySwap",
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;">
          <h2 style="color: #1a73e8; margin-top: 0;">Booking Confirmed! ✅</h2>
          <p>Hi <strong>${studentName}</strong>,</p>
          <p>Your mentorship session has been confirmed:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #666;">Mentor</td><td style="padding: 8px 0; font-weight: bold;">${mentorName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; font-weight: bold;">${formattedDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Time</td><td style="padding: 8px 0; font-weight: bold;">${formattedTime} (UTC)</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Duration</td><td style="padding: 8px 0; font-weight: bold;">${durationMinutes} minutes</td></tr>
          </table>
          ${meetButton}
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Booking ID: ${bookingId}</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err, bookingId, studentEmail }, "Failed to send student booking email");
  }

  // Mentor email
  if (mentorEmail) {
    try {
      await sendMail({
        to: mentorEmail,
        subject: "New Mentorship Booking — StudySwap",
        html: `
          <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;">
            <h2 style="color: #1a73e8; margin-top: 0;">New Booking! 📚</h2>
            <p>Hi <strong>${mentorName}</strong>,</p>
            <p>A student has booked a session with you:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px 0; color: #666;">Student</td><td style="padding: 8px 0; font-weight: bold;">${studentName}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; font-weight: bold;">${formattedDate}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Time</td><td style="padding: 8px 0; font-weight: bold;">${formattedTime} (UTC)</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Duration</td><td style="padding: 8px 0; font-weight: bold;">${durationMinutes} minutes</td></tr>
            </table>
            ${meetButton}
            <p style="color: #999; font-size: 12px; margin-top: 24px;">Booking ID: ${bookingId}</p>
          </div>
        `,
      });
    } catch (err) {
      logger.error({ err, bookingId, mentorEmail }, "Failed to send mentor booking email");
    }
  }
}

export async function getStudentBookings(studentId: string) {
  return await MentorsRepository.getStudentBookings(studentId);
}

export async function getStudentBooking(studentId: string, bookingId: string) {
  const result = await MentorsRepository.getStudentBooking(studentId, bookingId);
  if (!result) throw new AppError("Booking not found", 404);
  return result;
}

export async function cancelBooking(studentId: string, bookingId: string) {
  const result = await MentorsRepository.cancelBookingTransaction(studentId, bookingId);
  if (result.error) {
    throw new AppError(result.error, result.code);
  }

  // Delete Google Calendar event if it exists (fire-and-forget)
  if (result.googleEventId) {
    GoogleService.deleteMeeting(result.googleEventId).catch(err =>
      logger.error({ err, bookingId, eventId: result.googleEventId }, "Failed to delete Google Calendar event")
    );
  }
}
