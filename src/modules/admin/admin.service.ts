import { env } from "@/config/env";
import { AppError } from "@/core/errors/AppError";
import { generateToken } from "@/core/utils/jwt";
import type { AdminLoginInput, CreateCountryInput, UpdateCountryInput, CreateExamInput, UpdateExamInput } from "./admin.schema";
import { AdminRepository } from "./admin.repository";

type UpdateField = [column: string, value: unknown];

function addField(fields: UpdateField[], column: string, value: unknown) {
  if (value !== undefined) {
    fields.push([column, value]);
  }
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
  return await AdminRepository.getCountries();
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

export async function getExams() {
  return await AdminRepository.getExams();
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

export async function getUsers() {
  return await AdminRepository.getUsers();
}

export async function getStudents() {
  return await AdminRepository.getStudents();
}

export async function getMentorsUsers() {
  return await AdminRepository.getMentorsUsers();
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

  return await getUserById(id);
}

export async function deleteUser(id: string) {
  const deleted = await AdminRepository.deleteUser(id);
  if (!deleted) throw new AppError("User not found", 404);
}
