import { getClient, query } from "@/config/db";
import { env } from "@/config/env";
import { AppError } from "@/core/errors/AppError";
import { generateToken } from "@/core/utils/jwt";
import type { AdminLoginInput, CreateCountryInput, UpdateCountryInput, CreateExamInput, UpdateExamInput } from "./admin.schema";
import type { PoolClient } from "pg";

type UpdateField = [column: string, value: unknown];

function addField(fields: UpdateField[], column: string, value: unknown) {
  if (value !== undefined) {
    fields.push([column, value]);
  }
}

function buildSetClause(fields: UpdateField[], startIndex = 1) {
  return fields.map(([column], index) => `${column} = $${startIndex + index}`).join(", ");
}

async function assertUserExists(client: PoolClient, id: string) {
  const result = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [id]);
  if (result.rows.length === 0) {
    throw new AppError("User not found", 404);
  }
}

async function upsertProfile(client: PoolClient, userId: string, fields: UpdateField[]) {
  if (fields.length === 0) return;

  const columns = fields.map(([column]) => column);
  const values = fields.map(([, value]) => value);
  const placeholders = values.map((_, index) => `$${index + 2}`);
  const setClause = buildSetClause(fields, 2);

  await client.query(
    `INSERT INTO profiles (user_id, ${columns.join(", ")})
     VALUES ($1, ${placeholders.join(", ")})
     ON CONFLICT (user_id)
     DO UPDATE SET ${setClause}, updated_at = NOW()`,
    [userId, ...values]
  );
}

async function upsertMentor(client: PoolClient, userId: string, fields: UpdateField[]) {
  if (fields.length === 0) return;

  const columns = fields.map(([column]) => column);
  const values = fields.map(([, value]) => value);
  const placeholders = values.map((_, index) => `$${index + 2}`);
  const setClause = buildSetClause(fields, 2);

  await client.query(
    `INSERT INTO mentors (user_id, ${columns.join(", ")})
     VALUES ($1, ${placeholders.join(", ")})
     ON CONFLICT (user_id)
     DO UPDATE SET ${setClause}, updated_at = NOW()`,
    [userId, ...values]
  );
}

export async function login(input: AdminLoginInput) {
  if (input.email !== env.ADMIN_EMAIL || input.password !== env.ADMIN_PASSWORD) {
    throw new AppError("Invalid admin credentials", 401);
  }

  // Use a fixed UUID or simple string for admin ID
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

export async function getCountries() {
  const result = await query("SELECT * FROM countries ORDER BY created_at DESC");
  return result.rows;
}

export async function createCountry(input: CreateCountryInput) {
  const result = await query(
    "INSERT INTO countries (name, flag, iso_code) VALUES ($1, $2, $3) RETURNING *",
    [input.name, input.flag, input.isoCode]
  );
  return result.rows[0];
}

export async function updateCountry(id: string, input: UpdateCountryInput) {
  const fields: UpdateField[] = [];
  addField(fields, "name", input.name);
  addField(fields, "flag", input.flag);
  addField(fields, "iso_code", input.isoCode);

  const result =
    fields.length > 0
      ? await query(
          `UPDATE countries SET ${buildSetClause(fields)}, updated_at = NOW() WHERE id = $${
            fields.length + 1
          } RETURNING *`,
          [...fields.map(([, value]) => value), id]
        )
      : await query("SELECT * FROM countries WHERE id = $1", [id]);

  if (result.rows.length === 0) throw new AppError("Country not found", 404);
  return result.rows[0];
}

export async function deleteCountry(id: string) {
  const result = await query("DELETE FROM countries WHERE id = $1 RETURNING id", [id]);
  if (result.rows.length === 0) throw new AppError("Country not found", 404);
}

export async function getExams() {
  const result = await query("SELECT * FROM exams ORDER BY created_at DESC");
  return result.rows;
}

export async function getExamsByCountry(countryId: string) {
  const result = await query("SELECT * FROM exams WHERE country_id = $1 ORDER BY created_at DESC", [countryId]);
  return result.rows;
}

export async function createExam(input: CreateExamInput) {
  const result = await query(
    "INSERT INTO exams (country_id, name, is_active) VALUES ($1, $2, COALESCE($3, true)) RETURNING *",
    [input.countryId, input.name, input.isActive]
  );
  return result.rows[0];
}

export async function updateExam(id: string, input: UpdateExamInput) {
  const fields: UpdateField[] = [];
  addField(fields, "country_id", input.countryId);
  addField(fields, "name", input.name);
  addField(fields, "is_active", input.isActive);

  const result =
    fields.length > 0
      ? await query(
          `UPDATE exams SET ${buildSetClause(fields)}, updated_at = NOW() WHERE id = $${
            fields.length + 1
          } RETURNING *`,
          [...fields.map(([, value]) => value), id]
        )
      : await query("SELECT * FROM exams WHERE id = $1", [id]);

  if (result.rows.length === 0) throw new AppError("Exam not found", 404);
  return result.rows[0];
}

export async function deleteExam(id: string) {
  const result = await query("DELETE FROM exams WHERE id = $1 RETURNING id", [id]);
  if (result.rows.length === 0) throw new AppError("Exam not found", 404);
}

export async function getUsers() {
  const result = await query(`
    SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, p.full_name, p.profile_image, p.country_id, p.state, p.gender, p.age
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    ORDER BY u.created_at DESC
  `);
  return result.rows;
}

export async function getStudents() {
  const result = await query(`
    SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, p.full_name, p.profile_image, p.country_id, p.state, p.gender, p.age
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.role = 'student'
    ORDER BY u.created_at DESC
  `);
  return result.rows;
}

export async function getMentorsUsers() {
  const result = await query(`
    SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, p.full_name, p.profile_image, p.country_id, p.state, p.gender, p.age
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.role = 'mentor'
    ORDER BY u.created_at DESC
  `);
  return result.rows;
}

export async function getUserById(id: string) {
  const result = await query(`
    SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, 
           p.full_name, p.profile_image, p.age, p.gender, p.state, p.country_id, p.bio, 
           p.strong_in, p.need_help_with, p.study_time, p.looking_for
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id = $1
  `, [id]);
  if (result.rows.length === 0) throw new AppError("User not found", 404);
  return result.rows[0];
}

export async function updateStudent(id: string, input: any) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    await assertUserExists(client, id);

    // Update users table fields
    const userFields: string[] = [];
    const userValues: unknown[] = [];
    let uIdx = 1;

    if (input.role !== undefined) { userFields.push(`role = $${uIdx++}`); userValues.push(input.role); }
    if (input.emailVerified !== undefined) { userFields.push(`email_verified = $${uIdx++}`); userValues.push(input.emailVerified); }
    if (input.onboardingCompleted !== undefined) { userFields.push(`onboarding_completed = $${uIdx++}`); userValues.push(input.onboardingCompleted); }

    if (userFields.length > 0) {
      userFields.push(`updated_at = NOW()`);
      userValues.push(id);
      await client.query(`UPDATE users SET ${userFields.join(", ")} WHERE id = $${uIdx}`, userValues);
    }

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
    await upsertProfile(client, id, profileFields);
    
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  
  return await getUserById(id);
}

export async function updateMentorUser(id: string, input: any) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    await assertUserExists(client, id);

    // Update users table fields
    const userFields: string[] = [];
    const userValues: unknown[] = [];
    let uIdx = 1;

    if (input.role !== undefined) { userFields.push(`role = $${uIdx++}`); userValues.push(input.role); }
    if (input.emailVerified !== undefined) { userFields.push(`email_verified = $${uIdx++}`); userValues.push(input.emailVerified); }
    if (input.onboardingCompleted !== undefined) { userFields.push(`onboarding_completed = $${uIdx++}`); userValues.push(input.onboardingCompleted); }

    if (userFields.length > 0) {
      userFields.push(`updated_at = NOW()`);
      userValues.push(id);
      await client.query(`UPDATE users SET ${userFields.join(", ")} WHERE id = $${uIdx}`, userValues);
    }

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
    await upsertProfile(client, id, profileFields);

    const mentorFields: UpdateField[] = [];
    addField(mentorFields, "title", input.title);
    addField(mentorFields, "qualification", input.qualification);
    addField(mentorFields, "experience_years", input.experienceYears);
    addField(mentorFields, "hourly_price", input.hourlyPrice);
    addField(mentorFields, "is_verified", input.isVerified);
    await upsertMentor(client, id, mentorFields);
    
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  
  return await getUserById(id);
}

export async function deleteUser(id: string) {
  const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
  if (result.rows.length === 0) throw new AppError("User not found", 404);
}
