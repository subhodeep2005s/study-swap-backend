import { AppError } from "@/core/errors/AppError";
import { AdminRepository } from "../admin.repository";

export async function getMentors() {
  return await AdminRepository.getAdminMentors();
}

export async function getMentor(id: string) {
  const result = await AdminRepository.getAdminMentor(id);
  if (!result) throw new AppError("Mentor not found", 404);
  return result;
}

export async function updateMentor(id: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
  if (data.qualification !== undefined) { fields.push(`qualification = $${idx++}`); values.push(data.qualification); }
  if (data.experience_years !== undefined) { fields.push(`experience_years = $${idx++}`); values.push(data.experience_years); }
  if (data.hourly_price !== undefined) { fields.push(`hourly_price = $${idx++}`); values.push(data.hourly_price); }
  if (data.is_verified !== undefined) { fields.push(`is_verified = $${idx++}`); values.push(data.is_verified); }

  if (fields.length === 0) throw new AppError("No fields to update", 400);

  const result = await AdminRepository.updateAdminMentor(id, fields, values);
  
  if (!result) throw new AppError("Mentor not found", 404);
  return result;
}

export async function deleteMentor(id: string) {
  const deleted = await AdminRepository.deleteAdminMentor(id);
  if (!deleted) throw new AppError("Mentor not found", 404);
}

export async function verifyMentor(id: string) {
  const result = await AdminRepository.verifyAdminMentor(id);
  if (!result) throw new AppError("Mentor not found", 404);
  return result;
}

export async function getBookings() {
  return await AdminRepository.getAdminBookings();
}

export async function getBooking(id: string) {
  const result = await AdminRepository.getAdminBooking(id);
  if (!result) throw new AppError("Booking not found", 404);
  return result;
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
