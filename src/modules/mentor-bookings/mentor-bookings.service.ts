import { AppError } from "@/core/errors/AppError";
import { MentorBookingsRepository } from "./mentor-bookings.repository";

export async function getMentorProfile(userId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  return await MentorBookingsRepository.getMentorProfile(mentorId);
}

export async function updateMentorProfile(userId: string, data: any) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
  if (data.qualification !== undefined) { fields.push(`qualification = $${idx++}`); values.push(data.qualification); }
  if (data.experience_years !== undefined) { fields.push(`experience_years = $${idx++}`); values.push(data.experience_years); }
  if (data.hourly_price !== undefined) { fields.push(`hourly_price = $${idx++}`); values.push(data.hourly_price); }
  if (data.about !== undefined) { fields.push(`about = $${idx++}`); values.push(data.about); }
  
  return await MentorBookingsRepository.updateMentorProfile(mentorId, fields, values);
}

export async function getPlans(userId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  return await MentorBookingsRepository.getPlans(mentorId);
}

export async function createPlan(userId: string, data: any) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  return await MentorBookingsRepository.createPlan(mentorId, data);
}

export async function updatePlan(userId: string, planId: string, data: any) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.duration_minutes !== undefined) { fields.push(`duration_minutes = $${idx++}`); values.push(data.duration_minutes); }
  if (data.price !== undefined) { fields.push(`price = $${idx++}`); values.push(data.price); }
  if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }
  
  if (fields.length === 0) throw new AppError("No fields provided for update", 400);
  
  const result = await MentorBookingsRepository.updatePlan(planId, mentorId, fields, values);
  if (!result) throw new AppError("Plan not found", 404);
  return result;
}

export async function deletePlan(userId: string, planId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  const deleted = await MentorBookingsRepository.deletePlan(planId, mentorId);
  if (!deleted) throw new AppError("Plan not found", 404);
}

export async function getSlots(userId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  return await MentorBookingsRepository.getSlots(mentorId);
}

export async function createSlot(userId: string, data: { start_time: string, end_time: string }) {
  if (new Date(data.start_time) >= new Date(data.end_time)) {
    throw new AppError("End time must be after start time", 400);
  }

  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  const result = await MentorBookingsRepository.createSlot(mentorId, data);
  if (result.error) {
    throw new AppError(result.error, result.code);
  }
  return result.slot;
}

export async function updateSlot(userId: string, slotId: string, data: any) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  if (data.start_time !== undefined) { fields.push(`start_time = $${idx++}`); values.push(data.start_time); }
  if (data.end_time !== undefined) { fields.push(`end_time = $${idx++}`); values.push(data.end_time); }
  
  if (fields.length === 0) throw new AppError("No fields provided for update", 400);
  
  const result = await MentorBookingsRepository.updateSlotTransaction(slotId, mentorId, fields, values);
  if (result.error) {
    throw new AppError(result.error, result.code);
  }
  return result.slot;
}

export async function deleteSlot(userId: string, slotId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  const slot = await MentorBookingsRepository.getSlot(slotId, mentorId);
  if (!slot) throw new AppError("Slot not found", 404);
  if (slot.is_booked) throw new AppError("Cannot delete a booked slot", 400);

  await MentorBookingsRepository.deleteSlot(slotId);
}

export async function getBookings(userId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  return await MentorBookingsRepository.getBookings(mentorId);
}

export async function getBooking(userId: string, bookingId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  const result = await MentorBookingsRepository.getBooking(bookingId, mentorId);
  if (!result) throw new AppError("Booking not found", 404);
  return result;
}

export async function confirmBooking(userId: string, bookingId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  const result = await MentorBookingsRepository.updateBookingStatus(bookingId, mentorId, 'confirmed');
  if (!result) throw new AppError("Booking not found", 404);
  return result;
}

export async function completeBooking(userId: string, bookingId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  const result = await MentorBookingsRepository.updateBookingStatus(bookingId, mentorId, 'completed');
  if (!result) throw new AppError("Booking not found", 404);
  return result;
}

export async function cancelMentorBooking(userId: string, bookingId: string) {
  const mentorId = await MentorBookingsRepository.ensureMentor(userId);
  const result = await MentorBookingsRepository.cancelMentorBookingTransaction(bookingId, mentorId);
  if (result.error) {
    throw new AppError(result.error, result.code);
  }
}
