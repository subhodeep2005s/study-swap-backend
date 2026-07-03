import { query } from "@/config/db";
import { AppError } from "@/core/errors/AppError";

export async function getMentors() {
  const result = await query(`
    SELECT m.*, p.full_name, p.profile_image, u.email
    FROM mentors m
    JOIN profiles p ON p.user_id = m.user_id
    JOIN users u ON u.id = m.user_id
    ORDER BY m.created_at DESC
  `);
  return result.rows;
}

export async function getMentor(id: string) {
  const result = await query(`
    SELECT m.*, p.full_name, p.profile_image, u.email
    FROM mentors m
    JOIN profiles p ON p.user_id = m.user_id
    JOIN users u ON u.id = m.user_id
    WHERE m.id = $1
  `, [id]);
  if (result.rows.length === 0) throw new AppError("Mentor not found", 404);
  return result.rows[0];
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

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(`
    UPDATE mentors SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *
  `, values);
  
  if (result.rows.length === 0) throw new AppError("Mentor not found", 404);
  return result.rows[0];
}

export async function deleteMentor(id: string) {
  const result = await query("DELETE FROM mentors WHERE id = $1 RETURNING id", [id]);
  if (result.rows.length === 0) throw new AppError("Mentor not found", 404);
}

export async function verifyMentor(id: string) {
  const result = await query("UPDATE mentors SET is_verified = true, updated_at = NOW() WHERE id = $1 RETURNING *", [id]);
  if (result.rows.length === 0) throw new AppError("Mentor not found", 404);
  return result.rows[0];
}

export async function getBookings() {
  const result = await query(`
    SELECT 
      b.*,
      s.start_time, s.end_time,
      p.title as plan_title,
      u.email as student_email,
      prof.full_name as student_name
    FROM mentor_bookings b
    JOIN mentor_slots s ON s.id = b.slot_id
    JOIN mentor_plans p ON p.id = b.plan_id
    JOIN users u ON u.id = b.student_id
    JOIN profiles prof ON prof.user_id = u.id
    ORDER BY b.created_at DESC
  `);
  return result.rows;
}

export async function getBooking(id: string) {
  const result = await query(`
    SELECT 
      b.*,
      s.start_time, s.end_time,
      p.title as plan_title,
      u.email as student_email,
      prof.full_name as student_name
    FROM mentor_bookings b
    JOIN mentor_slots s ON s.id = b.slot_id
    JOIN mentor_plans p ON p.id = b.plan_id
    JOIN users u ON u.id = b.student_id
    JOIN profiles prof ON prof.user_id = u.id
    WHERE b.id = $1
  `, [id]);
  if (result.rows.length === 0) throw new AppError("Booking not found", 404);
  return result.rows[0];
}

export async function updateBooking(id: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
  if (data.payment_status !== undefined) { fields.push(`payment_status = $${idx++}`); values.push(data.payment_status); }

  if (fields.length === 0) throw new AppError("No fields to update", 400);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(`
    UPDATE mentor_bookings SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *
  `, values);
  
  if (result.rows.length === 0) throw new AppError("Booking not found", 404);
  return result.rows[0];
}

export async function deleteBooking(id: string) {
  const result = await query("DELETE FROM mentor_bookings WHERE id = $1 RETURNING id", [id]);
  if (result.rows.length === 0) throw new AppError("Booking not found", 404);
}
