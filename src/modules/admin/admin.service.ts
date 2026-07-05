import { env } from "@/config/env";
import { AppError } from "@/core/errors/AppError";
import { redis } from "@/config/redis";
import { generateToken } from "@/core/utils/jwt";
import type { AdminLoginInput, CreateCountryInput, UpdateCountryInput, CreateExamInput, UpdateExamInput } from "./admin.schema";
import { AdminRepository, type PaginationParams } from "./admin.repository";
import { GoogleService } from "@/modules/google/google.service";
import { logger } from "@/config/logger";
import { OnboardingRepository } from "@/modules/onboarding/onboarding.repository";

type UpdateField = [column: string, value: unknown];

function addField(fields: UpdateField[], column: string, value: unknown) {
  if (value !== undefined) {
    fields.push([column, value]);
  }
}

// =========================================================================
// Auth
// =========================================================================
export async function login(input: AdminLoginInput) {
  if (input.email !== env.ADMIN_EMAIL || input.password !== env.ADMIN_PASSWORD) {
    throw new AppError("Invalid admin credentials", 401);
  }

  const adminId = "00000000-0000-0000-0000-000000000000";

  const token = generateToken({
    id: adminId,
    email: env.ADMIN_EMAIL,
    role: "admin",
  });

  return {
    token,
    user: {
      id: adminId,
      email: env.ADMIN_EMAIL,
      role: "admin",
    },
  };
}

// =========================================================================
// Dashboard
// =========================================================================
export async function getDashboard() {
  const [overview, userSignups, bookingsByStatus, revenueByMonth, topMentors, topExams] = await Promise.all([
    AdminRepository.getDashboardOverview(),
    AdminRepository.getDashboardUserSignups(30),
    AdminRepository.getDashboardBookingsByStatus(),
    AdminRepository.getDashboardRevenueByMonth(6),
    AdminRepository.getDashboardTopMentors(5),
    AdminRepository.getDashboardTopExams(5),
  ]);

  return {
    overview,
    charts: {
      userSignups,
      bookingsByStatus,
      revenueByMonth,
      topMentors,
      topExams,
    },
  };
}

// =========================================================================
// Countries
// =========================================================================
export async function getCountries(params?: PaginationParams) {
  return await AdminRepository.getCountries(params);
}

export async function createCountry(input: CreateCountryInput) {
  return await AdminRepository.createCountry(input.name, input.flag, input.isoCode);
}

export async function updateCountry(id: string, input: UpdateCountryInput) {
  const fields: UpdateField[] = [];
  addField(fields, "name", input.name);
  addField(fields, "flag", input.flag);
  addField(fields, "iso_code", input.isoCode);

  const result = await AdminRepository.updateCountry(id, fields);
  if (!result) throw new AppError("Country not found", 404);
  return result;
}

export async function deleteCountry(id: string) {
  const deleted = await AdminRepository.deleteCountry(id);
  if (!deleted) throw new AppError("Country not found", 404);
}

// =========================================================================
// Exams
// =========================================================================
export async function getExams(params?: PaginationParams) {
  return await AdminRepository.getExams(params);
}

export async function getExamsByCountry(countryId: string) {
  return await AdminRepository.getExamsByCountry(countryId);
}

export async function createExam(input: CreateExamInput) {
  return await AdminRepository.createExam(input.countryId, input.name, input.isActive ?? true);
}

export async function updateExam(id: string, input: UpdateExamInput) {
  const fields: UpdateField[] = [];
  addField(fields, "country_id", input.countryId);
  addField(fields, "name", input.name);
  addField(fields, "is_active", input.isActive);

  const result = await AdminRepository.updateExam(id, fields);
  if (!result) throw new AppError("Exam not found", 404);
  return result;
}

export async function deleteExam(id: string) {
  const deleted = await AdminRepository.deleteExam(id);
  if (!deleted) throw new AppError("Exam not found", 404);
}

// =========================================================================
// Users
// =========================================================================
export async function getUsers(params?: PaginationParams) {
  return await AdminRepository.getUsers(params);
}

export async function getStudents(params?: PaginationParams) {
  return await AdminRepository.getStudents(params);
}

export async function getMentorsUsers(params?: PaginationParams) {
  return await AdminRepository.getMentorsUsers(params);
}

export async function getUserById(id: string) {
  const result = await AdminRepository.getUserById(id);
  if (!result) throw new AppError("User not found", 404);
  return result;
}

export async function updateStudent(id: string, input: any) {
  const userFields: string[] = [];
  const userValues: unknown[] = [];
  let uIdx = 1;

  if (input.role !== undefined) { userFields.push(`role = $${uIdx++}`); userValues.push(input.role); }
  if (input.emailVerified !== undefined) { userFields.push(`email_verified = $${uIdx++}`); userValues.push(input.emailVerified); }
  if (input.onboardingCompleted !== undefined) { userFields.push(`onboarding_completed = $${uIdx++}`); userValues.push(input.onboardingCompleted); }

  const profileFields: UpdateField[] = [];
  addField(profileFields, "full_name", input.fullName);
  addField(profileFields, "profile_image", input.profileImage);
  addField(profileFields, "age", input.age);
  addField(profileFields, "gender", input.gender);
  addField(profileFields, "state", input.state);
  addField(profileFields, "country_id", input.countryId);
  addField(profileFields, "bio", input.bio);
  addField(profileFields, "strong_in", input.strongIn);
  addField(profileFields, "need_help_with", input.needHelpWith);
  addField(profileFields, "study_time", input.studyTime);
  addField(profileFields, "looking_for", input.lookingFor);

  const result = await AdminRepository.updateUserTransaction(id, userFields, userValues, profileFields);
  if (result.error) throw new AppError(result.error, result.code);

  if (input.examIds !== undefined) {
    await OnboardingRepository.saveExamsTransaction(id, input.examIds);
  }

  return await getUserById(id);
}

export async function updateMentorUser(id: string, input: any) {
  const userFields: string[] = [];
  const userValues: unknown[] = [];
  let uIdx = 1;

  if (input.role !== undefined) { userFields.push(`role = $${uIdx++}`); userValues.push(input.role); }
  if (input.emailVerified !== undefined) { userFields.push(`email_verified = $${uIdx++}`); userValues.push(input.emailVerified); }
  if (input.onboardingCompleted !== undefined) { userFields.push(`onboarding_completed = $${uIdx++}`); userValues.push(input.onboardingCompleted); }

  const profileFields: UpdateField[] = [];
  addField(profileFields, "full_name", input.fullName);
  addField(profileFields, "profile_image", input.profileImage);
  addField(profileFields, "age", input.age);
  addField(profileFields, "gender", input.gender);
  addField(profileFields, "state", input.state);
  addField(profileFields, "country_id", input.countryId);
  addField(profileFields, "bio", input.bio);
  addField(profileFields, "strong_in", input.strongIn);
  addField(profileFields, "need_help_with", input.needHelpWith);
  addField(profileFields, "study_time", input.studyTime);
  addField(profileFields, "looking_for", input.lookingFor);

  const mentorFields: UpdateField[] = [];
  addField(mentorFields, "title", input.title);
  addField(mentorFields, "qualification", input.qualification);
  addField(mentorFields, "experience_years", input.experienceYears);
  addField(mentorFields, "hourly_price", input.hourlyPrice);
  addField(mentorFields, "is_verified", input.isVerified);

  const result = await AdminRepository.updateUserTransaction(id, userFields, userValues, profileFields, mentorFields);
  if (result.error) throw new AppError(result.error, result.code);

  if (input.examIds !== undefined) {
    await OnboardingRepository.saveExamsTransaction(id, input.examIds);
  }

  return await getUserById(id);
}

export async function deleteUser(id: string) {
  const deleted = await AdminRepository.deleteUser(id);
  if (!deleted) throw new AppError("User not found", 404);
}

// =========================================================================
// Matches
// =========================================================================
export async function getMatches(params?: PaginationParams) {
  return await AdminRepository.getMatches(params);
}

export async function getMatchesByUser(userId: string) {
  return await AdminRepository.getMatchesByUser(userId);
}

export async function deleteMatch(matchId: string) {
  const deleted = await AdminRepository.deleteMatch(matchId);
  if (!deleted) throw new AppError("Match not found", 404);
}

// =========================================================================
// Audit Logs
// =========================================================================
export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}) {
  return await AdminRepository.getAuditLogs(params);
}

// =========================================================================
// Mentors (Merged)
// =========================================================================
export async function getMentors() {
  return await AdminRepository.getAdminMentors();
}

export async function getMentor(id: string) {
  const result = await AdminRepository.getAdminMentor(id);
  if (!result) throw new AppError("Mentor not found", 404);
  return result;
}

export async function updateMentor(id: string, data: any) {
  const mentor = await AdminRepository.getAdminMentor(id);
  if (!mentor) throw new AppError("Mentor not found", 404);
  const userId = mentor.user_id;

  if (data.country_id !== undefined || data.state !== undefined) {
    const profileFields: UpdateField[] = [];
    addField(profileFields, "country_id", data.country_id);
    addField(profileFields, "state", data.state);
    if (profileFields.length > 0) {
      await OnboardingRepository.upsertProfile(userId, profileFields);
    }
  }

  if (data.exam_ids !== undefined) {
    await OnboardingRepository.saveExamsTransaction(userId, data.exam_ids);
  }

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
  if (data.qualification !== undefined) { fields.push(`qualification = $${idx++}`); values.push(data.qualification); }
  if (data.experience_years !== undefined) { fields.push(`experience_years = $${idx++}`); values.push(data.experience_years); }
  if (data.hourly_price !== undefined) { fields.push(`hourly_price = $${idx++}`); values.push(data.hourly_price); }
  if (data.is_verified !== undefined) { fields.push(`is_verified = $${idx++}`); values.push(data.is_verified); }

  if (fields.length > 0) {
    const result = await AdminRepository.updateAdminMentor(id, fields, values);
    if (!result) throw new AppError("Mentor not found", 404);
  }

  await redis.del("cache:mentors:list");

  return await getMentor(id);
}

export async function deleteMentor(id: string) {
  const deleted = await AdminRepository.deleteAdminMentor(id);
  if (!deleted) throw new AppError("Mentor not found", 404);
  await redis.del("cache:mentors:list");
}

export async function verifyMentor(id: string) {
  const result = await AdminRepository.verifyAdminMentor(id);
  if (!result) throw new AppError("Mentor not found", 404);
  await redis.del("cache:mentors:list");
  return result;
}

// =========================================================================
// Bookings (Merged)
// =========================================================================
export async function getBookings(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return await AdminRepository.getAdminBookings({
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    search: params?.search,
    status: params?.status,
  });
}

export async function getBooking(id: string) {
  const result = await AdminRepository.getAdminBooking(id);
  if (!result) throw new AppError("Booking not found", 404);
  return result;
}

export async function getBookingsByMentor(mentorId: string) {
  return await AdminRepository.getAdminBookingsByMentor(mentorId);
}

export async function updateBooking(id: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
  if (data.payment_status !== undefined) { fields.push(`payment_status = $${idx++}`); values.push(data.payment_status); }

  if (fields.length === 0) throw new AppError("No fields to update", 400);

  const result = await AdminRepository.updateAdminBooking(id, fields, values);
  if (!result) throw new AppError("Booking not found", 404);
  return result;
}

export async function deleteBooking(id: string) {
  const deleted = await AdminRepository.deleteAdminBooking(id);
  if (!deleted) throw new AppError("Booking not found", 404);
}

// =========================================================================
// Regenerate Meet Link (Merged)
// =========================================================================
export async function regenerateMeetLink(bookingId: string) {
  const booking = await AdminRepository.getBookingForMeetRegeneration(bookingId);
  if (!booking) throw new AppError("Booking not found or not in an active state", 404);

  if (!GoogleService.isConfigured()) {
    throw new AppError("Google Calendar is not configured", 503);
  }

  if (booking.google_event_id) {
    try {
      await GoogleService.deleteMeeting(booking.google_event_id);
    } catch (err) {
      logger.warn({ bookingId, eventId: booking.google_event_id }, "Failed to delete old Google event during regeneration");
    }
  }

  const meetResult = await GoogleService.createMeeting({
    mentorName: booking.mentor_name || "Mentor",
    mentorEmail: booking.mentor_email,
    studentName: booking.student_name || "Student",
    studentEmail: booking.student_email,
    bookingId,
    title: `StudySwap Mentoring Session`,
    description: `Mentoring session booked via StudySwap (regenerated by admin)`,
    startTime: new Date(booking.start_time).toISOString(),
    endTime: new Date(booking.end_time).toISOString(),
  });

  await AdminRepository.updateAdminBooking(
    bookingId,
    [
      `google_event_id = $1`,
      `google_meet_url = $2`,
      `google_calendar_url = $3`,
      `meeting_link = $4`,
    ],
    [meetResult.eventId, meetResult.meetUrl, meetResult.calendarUrl, meetResult.meetUrl]
  );

  logger.info({ bookingId, meetUrl: meetResult.meetUrl }, "Admin regenerated Google Meet link");

  return {
    meetUrl: meetResult.meetUrl,
    calendarUrl: meetResult.calendarUrl,
    eventId: meetResult.eventId,
  };
}

// =========================================================================
// Slots (Merged)
// =========================================================================
export async function getMentorSlots(mentorId: string) {
  return await AdminRepository.getMentorSlots(mentorId);
}

export async function deleteSlot(slotId: string) {
  const deleted = await AdminRepository.deleteSlot(slotId);
  if (!deleted) throw new AppError("Slot not found or is currently booked", 400);
}

// =========================================================================
// Plans (Merged)
// =========================================================================
export async function getMentorPlans(mentorId: string) {
  return await AdminRepository.getMentorPlans(mentorId);
}

export async function updatePlan(planId: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.duration_minutes !== undefined) { fields.push(`duration_minutes = $${idx++}`); values.push(data.duration_minutes); }
  if (data.price !== undefined) { fields.push(`price = $${idx++}`); values.push(data.price); }
  if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }

  if (fields.length === 0) throw new AppError("No fields to update", 400);

  const result = await AdminRepository.updatePlan(planId, fields, values);
  if (!result) throw new AppError("Plan not found", 404);
  return result;
}

export async function deletePlan(planId: string) {
  const result = await AdminRepository.deletePlan(planId);
  if ("error" in result) throw new AppError(result.error as string, result.code as number);
}
