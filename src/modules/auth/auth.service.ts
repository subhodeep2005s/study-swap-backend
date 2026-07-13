import { AppError } from "@/core/errors/AppError";
import { generateToken } from "@/core/utils/jwt";
import { otpEmailTemplate } from "@/core/utils/email-templates";
import { env } from "@/config/env";
import { AuthRepository } from "./auth.repository";
import { redis } from "@/config/redis";
import { logger } from "@/config/logger";
import { resend } from "@/config/resend";

export async function sendOtp(email: string): Promise<void> {
  const isDemoUser = email === "demouser@netpiedev.in";

  if (!isDemoUser && (!env.RESEND_API_KEY || !env.RESEND_MAIL)) {
    throw new AppError("Email service is currently unavailable", 503);
  }

  const otp = isDemoUser ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();
  const redisKey = `otp:${email}`;

  // Check if an OTP was recently sent (rate limiting)
  const ttl = await redis.ttl(redisKey);
  if (!isDemoUser && ttl > 240) {
    // If ttl > 4 minutes (meaning sent < 1 min ago)
    throw new AppError("Please wait before requesting a new OTP", 429);
  }

  // Store OTP in Redis with 5 minutes expiry
  await redis.set(redisKey, otp, "EX", 300);

  if (isDemoUser) {
    logger.info({ email }, "Demo user OTP set to 123456");
    return;
  }

  try {
    await resend.emails.send({
      from: env.RESEND_MAIL!,
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

export async function verifyOtp(email: string, otp: string, requestedRole?: "student" | "mentor") {
  const isDemoUser = email === "demouser@netpiedev.in" && otp === "123456";

  if (!isDemoUser) {
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
  }

  const userResult = await AuthRepository.getUserByEmail(email);

  let user: { id: string; email: string; role: "admin" | "student" | "mentor"; onboarding_completed: boolean; full_name?: string; profile_image?: string };

  if (!userResult) {
    // Create new user if they don't exist
    user = await AuthRepository.createUser(email, requestedRole || 'student') as any;
    logger.info({ userId: user.id }, "New user created via OTP login");
  } else {
    user = userResult as any;
    // Ensure email is marked as verified
    await AuthRepository.markEmailVerified(email);
    
    // If they explicitly requested a mentor role during login, upgrade them
    if (requestedRole === "mentor" && user.role !== "mentor" && user.role !== "admin") {
      await AuthRepository.updateUserRole(email, "mentor");
      user.role = "mentor";
    }
    
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
      fullName: user.full_name,
      profileImage: user.profile_image,
    },
  };
}

export async function getMe(userId: string) {
  const user = await AuthRepository.getMe(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }
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
    educationNodes: user.educationNodes,
  };
}

export async function deleteAccount(userId: string) {
  const user = await AuthRepository.getMe(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  
  await AuthRepository.deleteAccount(userId);
  logger.info({ userId }, "User account deleted successfully");
}

export async function updateNotificationToken(userId: string, token: string) {
  await AuthRepository.updateNotificationToken(userId, token);
}
