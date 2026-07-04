import { AppError } from "@/core/errors/AppError";
import { Event, eventEmitter } from "@/config/event";
import { redis } from "@/config/redis";
import { MentorsRepository } from "./mentors.repository";

export async function getMentors() {
  const cacheKey = "cache:mentors:list";
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await MentorsRepository.getVerifiedMentors();
  
  await redis.set(cacheKey, JSON.stringify(result), "EX", 300); // 5 minutes
  return result;
}

export async function getMentorsByMyExams(userId: string) {
  const cacheKey = `cache:mentors:my-exams:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await MentorsRepository.getMentorsByMyExams(userId);
  
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

export async function getMentorSlots(mentorId: string) {
  return await MentorsRepository.getMentorSlots(mentorId);
}

export async function bookSession(studentId: string, mentorId: string, planId: string, slotId: string) {
  const result = await MentorsRepository.bookSessionTransaction(studentId, mentorId, planId, slotId);
  if (result.error) {
    throw new AppError(result.error, result.code);
  }

  eventEmitter.emit(Event.MENTOR_SESSION_BOOKED, {
    studentId,
    bookingId: result.bookingId,
  });

  return { bookingId: result.bookingId, meetingLink: result.meetingLink };
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
}
