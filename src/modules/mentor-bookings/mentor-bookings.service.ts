import { query, getClient } from "@/config/db";
import { AppError } from "@/core/errors/AppError";

// Make sure mentor row exists for user, since it might be first time
async function ensureMentor(userId: string) {
  const result = await query("SELECT id FROM mentors WHERE user_id = $1", [userId]);
  if (result.rows.length === 0) {
    const insertRes = await query("INSERT INTO mentors (user_id) VALUES ($1) RETURNING id", [userId]);
    return insertRes.rows[0]!.id;
  }
  return result.rows[0]!.id;
}

export async function getMentorProfile(userId: string) {
  const mentorId = await ensureMentor(userId);
  const result = await query("SELECT * FROM mentors WHERE id = $1", [mentorId]);
  return result.rows[0];
}

export async function updateMentorProfile(userId: string, data: any) {
  const mentorId = await ensureMentor(userId);
  
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
  if (data.qualification !== undefined) { fields.push(`qualification = $${idx++}`); values.push(data.qualification); }
  if (data.experience_years !== undefined) { fields.push(`experience_years = $${idx++}`); values.push(data.experience_years); }
  if (data.hourly_price !== undefined) { fields.push(`hourly_price = $${idx++}`); values.push(data.hourly_price); }
  if (data.about !== undefined) { fields.push(`about = $${idx++}`); values.push(data.about); }
  
  if (fields.length === 0) return await getMentorProfile(userId);
  
  fields.push(`updated_at = NOW()`);
  values.push(mentorId);
  
  const result = await query(`
    UPDATE mentors SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *
  `, values);
  
  return result.rows[0];
}

export async function getPlans(userId: string) {
  const mentorId = await ensureMentor(userId);
  const result = await query("SELECT * FROM mentor_plans WHERE mentor_id = $1 ORDER BY created_at DESC", [mentorId]);
  return result.rows;
}

export async function createPlan(userId: string, data: any) {
  const mentorId = await ensureMentor(userId);
  const result = await query(
    `INSERT INTO mentor_plans (mentor_id, title, description, duration_minutes, price, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [mentorId, data.title, data.description, data.duration_minutes, data.price, data.is_active ?? true]
  );
  return result.rows[0];
}

export async function updatePlan(userId: string, planId: string, data: any) {
  const mentorId = await ensureMentor(userId);
  
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.duration_minutes !== undefined) { fields.push(`duration_minutes = $${idx++}`); values.push(data.duration_minutes); }
  if (data.price !== undefined) { fields.push(`price = $${idx++}`); values.push(data.price); }
  if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }
  
  if (fields.length === 0) throw new AppError("No fields provided for update", 400);
  
  fields.push(`updated_at = NOW()`);
  values.push(planId, mentorId);
  
  const result = await query(
    `UPDATE mentor_plans SET ${fields.join(", ")} WHERE id = $${idx} AND mentor_id = $${idx + 1} RETURNING *`,
    values
  );
  if (result.rows.length === 0) throw new AppError("Plan not found", 404);
  return result.rows[0];
}

export async function deletePlan(userId: string, planId: string) {
  const mentorId = await ensureMentor(userId);
  const result = await query("DELETE FROM mentor_plans WHERE id = $1 AND mentor_id = $2 RETURNING id", [planId, mentorId]);
  if (result.rows.length === 0) throw new AppError("Plan not found", 404);
}

export async function getSlots(userId: string) {
  const mentorId = await ensureMentor(userId);
  const result = await query("SELECT * FROM mentor_slots WHERE mentor_id = $1 ORDER BY start_time ASC", [mentorId]);
  return result.rows;
}

export async function createSlot(userId: string, data: { start_time: string, end_time: string }) {
  if (new Date(data.start_time) >= new Date(data.end_time)) {
    throw new AppError("End time must be after start time", 400);
  }

  const mentorId = await ensureMentor(userId);
  const result = await query(
    `INSERT INTO mentor_slots (mentor_id, start_time, end_time, is_booked)
     VALUES ($1, $2, $3, false) RETURNING *`,
    [mentorId, data.start_time, data.end_time]
  );
  return result.rows[0];
}

export async function updateSlot(userId: string, slotId: string, data: any) {
  const mentorId = await ensureMentor(userId);
  
  const client = await getClient();
  try {
    await client.query("BEGIN");
    
    // check if slot is booked
    const slotRes = await client.query("SELECT is_booked, start_time, end_time FROM mentor_slots WHERE id = $1 AND mentor_id = $2 FOR UPDATE", [slotId, mentorId]);
    if (slotRes.rows.length === 0) throw new AppError("Slot not found", 404);
    if (slotRes.rows[0]!.is_booked) throw new AppError("Cannot modify a booked slot", 400);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    
    if (data.start_time !== undefined) { fields.push(`start_time = $${idx++}`); values.push(data.start_time); }
    if (data.end_time !== undefined) { fields.push(`end_time = $${idx++}`); values.push(data.end_time); }
    
    if (fields.length === 0) throw new AppError("No fields provided for update", 400);
    
    fields.push(`updated_at = NOW()`);
    values.push(slotId, mentorId);
    
    const result = await client.query(
      `UPDATE mentor_slots SET ${fields.join(", ")} WHERE id = $${idx} AND mentor_id = $${idx + 1} RETURNING *`,
      values
    );
    
    if (new Date(result.rows[0]!.start_time) >= new Date(result.rows[0]!.end_time)) {
      await client.query("ROLLBACK");
      throw new AppError("End time must be after start time", 400);
    }
    
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteSlot(userId: string, slotId: string) {
  const mentorId = await ensureMentor(userId);
  // Check if booked
  const slotRes = await query("SELECT is_booked FROM mentor_slots WHERE id = $1 AND mentor_id = $2", [slotId, mentorId]);
  if (slotRes.rows.length === 0) throw new AppError("Slot not found", 404);
  if (slotRes.rows[0]!.is_booked) throw new AppError("Cannot delete a booked slot", 400);

  await query("DELETE FROM mentor_slots WHERE id = $1", [slotId]);
}

export async function getBookings(userId: string) {
  const mentorId = await ensureMentor(userId);
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

export async function getBooking(userId: string, bookingId: string) {
  const mentorId = await ensureMentor(userId);
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
  if (result.rows.length === 0) throw new AppError("Booking not found", 404);
  return result.rows[0];
}

export async function confirmBooking(userId: string, bookingId: string) {
  const mentorId = await ensureMentor(userId);
  const result = await query(
    "UPDATE mentor_bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1 AND mentor_id = $2 RETURNING *",
    [bookingId, mentorId]
  );
  if (result.rows.length === 0) throw new AppError("Booking not found", 404);
  return result.rows[0];
}

export async function completeBooking(userId: string, bookingId: string) {
  const mentorId = await ensureMentor(userId);
  const result = await query(
    "UPDATE mentor_bookings SET status = 'completed', updated_at = NOW() WHERE id = $1 AND mentor_id = $2 RETURNING *",
    [bookingId, mentorId]
  );
  if (result.rows.length === 0) throw new AppError("Booking not found", 404);
  return result.rows[0];
}

export async function cancelMentorBooking(userId: string, bookingId: string) {
  const mentorId = await ensureMentor(userId);
  const client = await getClient();
  try {
    await client.query("BEGIN");
    
    const bookingRes = await client.query("SELECT slot_id, status FROM mentor_bookings WHERE id = $1 AND mentor_id = $2 FOR UPDATE", [bookingId, mentorId]);
    if (bookingRes.rows.length === 0) throw new AppError("Booking not found", 404);
    
    const booking = bookingRes.rows[0];
    if (booking.status === 'cancelled') throw new AppError("Booking is already cancelled", 400);
    if (booking.status === 'completed') throw new AppError("Cannot cancel a completed booking", 400);
    
    // Free slot
    await client.query("UPDATE mentor_slots SET is_booked = false WHERE id = $1", [booking.slot_id]);
    
    // Cancel booking
    await client.query("UPDATE mentor_bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [bookingId]);
    
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
