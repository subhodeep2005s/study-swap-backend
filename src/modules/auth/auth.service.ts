import { query } from "@/config/db";
import { logger } from "@/config/logger";
import { redis } from "@/config/redis";
import { resend } from "@/config/resend";
import { AppError } from "@/core/errors/AppError";
import { generateToken } from "@/core/utils/jwt";
import { otpEmailTemplate } from "@/core/utils/email-templates";
import { env } from "@/config/env";

export async function sendOtp(email: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESEND_MAIL) {
    throw new AppError("Email service is currently unavailable", 503);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const redisKey = `otp:${email}`;

  // Check if an OTP was recently sent (rate limiting)
  const ttl = await redis.ttl(redisKey);
  if (ttl > 240) {
    // If ttl > 4 minutes (meaning sent < 1 min ago)
    throw new AppError("Please wait before requesting a new OTP", 429);
  }

  // Store OTP in Redis with 5 minutes expiry
  await redis.set(redisKey, otp, "EX", 300);

  try {
    await resend.emails.send({
      from: env.RESEND_MAIL,
      to: email,
      subject: "Your StudySwap Login Code",
      html: otpEmailTemplate(otp),
      text: `Your StudySwap login code is ${otp}. It will expire in 5 minutes. Never share this code with anyone.`,
    });
    logger.info({ email }, "OTP sent successfully");
  } catch (error) {
    logger.error({ error, email }, "Failed to send OTP email");
    // Ensure we don't block login forever if email fails, but do throw error
    await redis.del(redisKey);
    throw new AppError("Failed to send email. Please try again later.", 500);
  }
}

export async function resendOtp(email: string): Promise<void> {
  const countKey = `otp_resend_count:${email}`;
  const resendCount = await redis.get(countKey);
  
  if (resendCount && parseInt(resendCount, 10) >= 3) {
    throw new AppError("Maximum resend attempts reached. Please wait before trying again.", 429);
  }

  // Use the underlying sendOtp function which generates and emails the code
  await sendOtp(email);

  if (resendCount) {
    await redis.incr(countKey);
  } else {
    // Limit to 3 resends per hour
    await redis.set(countKey, "1", "EX", 3600);
  }
}

export async function verifyOtp(email: string, otp: string) {
  const redisKey = `otp:${email}`;
  const storedOtp = await redis.get(redisKey);

  if (!storedOtp) {
    throw new AppError("OTP expired or not found", 400);
  }

  if (storedOtp !== otp) {
    throw new AppError("Invalid OTP", 400);
  }

  // Remove OTP after successful verification
  await redis.del(redisKey);
  await redis.del(`otp_resend_count:${email}`); // Reset resend count on successful login

  const userResult = await query(
    "SELECT id, email, role, onboarding_completed FROM users WHERE email = $1",
    [email],
  );

  let user: { id: string; email: string; role: "admin" | "student" | "mentor"; onboarding_completed: boolean };

  if (userResult.rows.length === 0) {
    // Create new user if they don't exist
    const insertResult = await query(
      `INSERT INTO users (email, email_verified, role, onboarding_completed) 
       VALUES ($1, true, 'student', false) RETURNING id, email, role, onboarding_completed`,
      [email],
    );
    user = insertResult.rows[0] as typeof user;
    logger.info({ userId: user.id }, "New user created via OTP login");
  } else {
    user = userResult.rows[0] as typeof user;
    // Ensure email is marked as verified
    await query("UPDATE users SET email_verified = true WHERE email = $1", [email]);
    logger.info({ userId: user.id }, "Existing user logged in via OTP");
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboarding_completed,
    },
  };
}

export async function getMe(userId: string) {
  const result = await query(
    `SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, 
            p.full_name, p.profile_image, p.age, p.gender, p.state, p.country_id, p.bio, 
            p.strong_in, p.need_help_with, p.study_time, p.looking_for
     FROM users u
     LEFT JOIN profiles p ON u.id = p.user_id
     WHERE u.id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new AppError("User not found", 404);
  }

  const user = result.rows[0]!;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.email_verified,
    onboardingCompleted: user.onboarding_completed,
    createdAt: user.created_at,
    fullName: user.full_name,
    profileImage: user.profile_image,
    age: user.age,
    gender: user.gender,
    state: user.state,
    countryId: user.country_id,
    bio: user.bio,
    strongIn: user.strong_in,
    needHelpWith: user.need_help_with,
    studyTime: user.study_time,
    lookingFor: user.looking_for,
  };
}
