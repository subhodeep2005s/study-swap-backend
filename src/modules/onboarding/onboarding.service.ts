import { query, getClient } from "@/config/db";
import { AppError } from "@/core/errors/AppError";
import type { CountryInput, ProfileInput, ExamsInput, StudyInput, PreferencesInput } from "./onboarding.schema";
import { enhanceBioPrompt } from "./onboarding.ai";
import { welcomeEmailTemplate } from "@/core/utils/email-templates";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { resend } from "@/config/resend";

type ProfileField = [column: string, value: unknown];

function addProfileField(fields: ProfileField[], column: string, value: unknown) {
  if (value !== undefined) {
    fields.push([column, value]);
  }
}

async function upsertProfile(userId: string, fields: ProfileField[]) {
  if (fields.length === 0) return;

  const columns = fields.map(([column]) => column);
  const values = fields.map(([, value]) => value);
  const placeholders = values.map((_, index) => `$${index + 2}`);
  const setClause = fields
    .map(([column], index) => `${column} = $${index + 2}`)
    .join(", ");

  await query(
    `INSERT INTO profiles (user_id, ${columns.join(", ")})
     VALUES ($1, ${placeholders.join(", ")})
     ON CONFLICT (user_id)
     DO UPDATE SET ${setClause}, updated_at = NOW()`,
    [userId, ...values]
  );
}

export async function getStatus(userId: string) {
  const result = await query("SELECT onboarding_completed FROM users WHERE id = $1", [userId]);
  if (result.rows.length === 0) throw new AppError("User not found", 404);
  return { onboardingCompleted: result.rows[0]!.onboarding_completed };
}

export async function saveCountry(userId: string, input: CountryInput) {
  // Check if country exists
  const countryResult = await query("SELECT id FROM countries WHERE id = $1", [input.countryId]);
  if (countryResult.rows.length === 0) throw new AppError("Country not found", 404);

  // Upsert profile
  await query(
    `INSERT INTO profiles (user_id, country_id) 
     VALUES ($1, $2) 
     ON CONFLICT (user_id) 
     DO UPDATE SET country_id = EXCLUDED.country_id`,
    [userId, input.countryId]
  );
}

export async function updateProfile(userId: string, input: ProfileInput) {
  const fields: ProfileField[] = [];
  addProfileField(fields, "full_name", input.fullName);
  addProfileField(fields, "profile_image", input.profileImage);
  addProfileField(fields, "age", input.age);
  addProfileField(fields, "gender", input.gender);
  addProfileField(fields, "state", input.state);
  addProfileField(fields, "bio", input.bio);
  await upsertProfile(userId, fields);
}

export async function getExams(userId: string) {
  const result = await query(
    `SELECT e.id, e.name 
     FROM user_exams ue 
     JOIN exams e ON ue.exam_id = e.id 
     WHERE ue.user_id = $1`,
    [userId]
  );
  return result.rows;
}

export async function saveExams(userId: string, input: ExamsInput) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    
    // Clear existing exams for user
    await client.query("DELETE FROM user_exams WHERE user_id = $1", [userId]);
    
    // Insert new exams
    if (input.examIds.length > 0) {
      const placeholders = input.examIds.map((_, i) => `($1, $${i + 2})`).join(",");
      await client.query(
        `INSERT INTO user_exams (user_id, exam_id) VALUES ${placeholders}`,
        [userId, ...input.examIds]
      );
    }
    
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveStudyDetails(userId: string, input: StudyInput) {
  const fields: ProfileField[] = [];
  addProfileField(fields, "strong_in", input.strongIn);
  addProfileField(fields, "need_help_with", input.needHelpWith);
  addProfileField(fields, "study_time", input.studyTime);
  await upsertProfile(userId, fields);
}

export async function savePreferences(userId: string, input: PreferencesInput) {
  const fields: ProfileField[] = [];
  addProfileField(fields, "looking_for", input.lookingFor);
  await upsertProfile(userId, fields);
}

export async function completeOnboarding(userId: string, email: string) {
  await query(
    "UPDATE users SET onboarding_completed = true WHERE id = $1",
    [userId]
  );

  // Send onboarding success email
  if (env.RESEND_API_KEY && env.RESEND_MAIL) {
    try {
      await resend.emails.send({
        from: env.RESEND_MAIL,
        to: email,
        subject: "Welcome to StudySwap! 🎉",
        html: welcomeEmailTemplate(),
        text: "Congratulations! Your profile is ready. Go to the app and find your study partner match.",
      });
      logger.info({ userId, email }, "Onboarding success email sent");
    } catch (error) {
      logger.error({ error, userId, email }, "Failed to send onboarding success email");
      // We don't throw the error here, onboarding is successfully completed in DB
    }
  }
}

export async function enhanceBio(bio: string): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    logger.error("GEMINI_API_KEY is missing");
    throw new AppError("AI features are currently unavailable", 503);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const prompt = enhanceBioPrompt(bio);

    // Using the official SDK generateContent method
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const enhancedBio = response.text;
    if (!enhancedBio) {
      throw new Error("Empty response from AI");
    }

    return enhancedBio.trim();
  } catch (error) {
    logger.error({ error }, "Failed to enhance bio via Gemini");
    throw new AppError("Failed to enhance bio. Please try again later.", 500);
  }
}
