import { AppError } from "@/core/errors/AppError";
import type { CountryInput, ProfileInput, ExamsInput, StudyInput, PreferencesInput } from "./onboarding.schema";
import { redis } from "@/config/redis";
import { enhanceBioPrompt } from "./onboarding.ai";
import { welcomeEmailTemplate } from "@/core/utils/email-templates";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { resend } from "@/config/resend";
import { NotificationService } from "@/modules/notifications/notification.service";
import { OnboardingRepository } from "./onboarding.repository";
import { query } from "@/config/db";
import { eventEmitter, Event } from "@/config/event";

type ProfileField = [column: string, value: unknown];

function addProfileField(fields: ProfileField[], column: string, value: unknown) {
  if (value !== undefined) {
    fields.push([column, value]);
  }
}

export async function getStatus(userId: string) {
  const result = await OnboardingRepository.getStatus(userId);
  if (!result) throw new AppError("User not found", 404);
  return { onboardingCompleted: result.onboarding_completed };
}

export async function saveCountry(userId: string, input: CountryInput) {
  const exists = await OnboardingRepository.checkCountryExists(input.countryId);
  if (!exists) throw new AppError("Country not found", 404);

  await OnboardingRepository.saveCountry(userId, input.countryId);
}

export async function updateProfile(userId: string, input: ProfileInput) {
  const fields: ProfileField[] = [];
  addProfileField(fields, "full_name", input.fullName);
  addProfileField(fields, "profile_image", input.profileImage);
  addProfileField(fields, "age", input.age);
  addProfileField(fields, "gender", input.gender);
  addProfileField(fields, "state", input.state);
  addProfileField(fields, "bio", input.bio);
  await OnboardingRepository.upsertProfile(userId, fields);
}

export async function getExams(userId: string) {
  return await OnboardingRepository.getExams(userId);
}

export async function saveExams(userId: string, input: ExamsInput) {
  await OnboardingRepository.saveExamsTransaction(userId, input.examIds);
}

export async function saveStudyDetails(userId: string, input: StudyInput) {
  const fields: ProfileField[] = [];
  addProfileField(fields, "strong_in", input.strongIn);
  addProfileField(fields, "need_help_with", input.needHelpWith);
  addProfileField(fields, "study_time", input.studyTime);
  await OnboardingRepository.upsertProfile(userId, fields);
}

export async function savePreferences(userId: string, input: PreferencesInput) {
  const fields: ProfileField[] = [];
  addProfileField(fields, "looking_for", input.lookingFor);
  await OnboardingRepository.upsertProfile(userId, fields);
}

export async function completeOnboarding(userId: string, email: string) {
  await OnboardingRepository.completeOnboarding(userId);

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

  // Send Push Notification
  NotificationService.sendToUser(
    userId,
    "Welcome to StudySwap! 🎉",
    "Your profile is ready. Go find your first study partner!",
    { type: "onboarding_complete" }
  ).catch(err => console.error("Push error", err));
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

export async function applyForMentor(userId: string, input: import("./onboarding.schema").MentorApplicationInput) {
  // Call the transaction method to upsert mentor data and update user role to 'mentor'
  await OnboardingRepository.applyForMentorTransaction(userId, input);
  
  // Invalidate mentors cache list
  await redis.del("cache:mentors:list");
  
  // Fetch user details for notification
  const userResult = await query(
    `SELECT u.email, p.full_name as name 
     FROM users u 
     LEFT JOIN profiles p ON p.user_id = u.id 
     WHERE u.id = $1`,
    [userId]
  );
  
  if (userResult.rows[0]) {
    const { email, name } = userResult.rows[0];
    eventEmitter.emit(Event.MENTOR_REGISTERED, {
      mentorId: userId,
      email,
      name: name || "Mentor",
      phoneNumber: input.phoneNumber || "Not provided",
    });
  }
}
