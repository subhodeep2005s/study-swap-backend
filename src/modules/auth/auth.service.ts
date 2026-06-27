import { query } from "@/config/db";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { redis } from "@/config/redis";
import { AppError } from "@/core/errors/AppError";
import { comparePassword, hashPassword } from "@/core/utils/hash";
import { generateToken, type JWTPayload } from "@/core/utils/jwt";
import crypto from "node:crypto";
import type { AdminLoginInput, LoginInput, RegisterInput } from "./auth.schema";

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  password: string;
  is_verified: boolean;
  is_active: boolean;
  is_deleted: boolean;
}

// ── User Register ────────────────────────────────────────────────────

export async function register(input: RegisterInput) {
  const existing = await query<UserRow>("SELECT id, is_deleted FROM users WHERE email = $1", [
    input.email,
  ]);

  if (existing.rows.length > 0) {
    if (existing.rows[0]?.is_deleted) {
      logger.warn({ email: input.email }, "Marked as deleted by admin, please contact admin");
      throw new AppError("Account has been deleted, please contact admin", 409);
    }
    logger.warn({ email: input.email }, "Email already registered");
    throw new AppError("Email already registered", 409);
  }

  const hashedPassword = await hashPassword(input.password);
  logger.debug({ email: input.email }, "Creating new user");

  const result = await query<UserRow>(
    `INSERT INTO users (email, password, first_name, last_name, mobile_number)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, mobile_number`,
    [input.email, hashedPassword, input.firstName, input.lastName, input.mobileNumber],
  );

  const user = result.rows[0]!;
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: "user",
  };

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    mobileNumber: user.mobile_number,
    token: generateToken(payload),
  };
}

// ── User Login ───────────────────────────────────────────────────────

export async function login(input: LoginInput) {
  const result = await query<UserRow>(
    "SELECT id, email, password, first_name, last_name, mobile_number, is_active, is_deleted FROM users WHERE email = $1",
    [input.email],
  );

  if (result.rows.length === 0) {
    logger.warn({ email: input.email }, "Login failed: user not found");
    throw new AppError("Invalid credentials", 401);
  }

  const user = result.rows[0]!;

  if (user.is_deleted) {
    logger.warn({ email: input.email }, "Login failed: account deleted");
    throw new AppError("Account has been deleted, please contact admin", 401);
  }

  const isValid = await comparePassword(input.password, user.password);
  if (!isValid) {
    logger.warn({ userId: user.id }, "Login failed: invalid password");
    throw new AppError("Invalid credentials", 401);
  }

  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: "user",
  };

  return {
    token: generateToken(payload),
  };
}

// ── Admin Login (hardcoded) ──────────────────────────────────────────

export async function adminLogin(input: AdminLoginInput) {
  if (input.email !== env.ADMIN_EMAIL || input.password !== env.ADMIN_PASSWORD) {
    logger.warn({ email: input.email }, "Admin login failed: invalid credentials");
    throw new AppError("Invalid credentials", 401);
  }

  const payload: JWTPayload = {
    id: "admin",
    email: env.ADMIN_EMAIL,
    role: "admin",
  };

  logger.info("Admin login successful");

  return {
    token: generateToken(payload),
  };
}

// ── OTP ──────────────────────────────────────────────────────────────

export async function generateOTP({ userId }: { userId: string }) {
  const rateLimitKey = `otp_ratelimit:${userId}`;
  const isRateLimited = await redis.get(rateLimitKey);
  if (isRateLimited) {
    throw new AppError("Too many requests. Please wait before requesting another OTP.", 429);
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  await redis.set(`otp:${userId}`, hashedOtp, "EX", 60 * 5);
  await redis.del(`otp_attempts:${userId}`);
  await redis.set(rateLimitKey, "1", "EX", 60);

  return otp;
}

export async function resendOTP({ email }: { email: string }) {
  const userResult = await query<UserRow>("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  const user = userResult.rows[0];
  if (!user) throw new AppError("User not found", 404);

  const otp = await generateOTP({ userId: user.id });
  return { id: user.id, role: "user", otp };
}

export async function verifyOTP({ email, otp }: { email: string; otp: string }) {
  const userResult = await query<UserRow>("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  const user = userResult.rows[0];
  if (!user) throw new AppError("User not found", 404);
  const userId = user.id;

  const attemptsKey = `otp_attempts:${userId}`;
  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) {
    await redis.expire(attemptsKey, 60 * 5);
  }

  if (attempts > 5) {
    await redis.del(`otp:${userId}`);
    throw new AppError("Too many failed attempts. Please request a new OTP.", 429);
  }

  const storedHashedOTP = await redis.get(`otp:${userId}`);
  if (!storedHashedOTP) {
    logger.warn({ userId }, "Verify OTP failed: OTP expired or not requested");
    throw new AppError("OTP expired or not requested", 400);
  }

  const providedHashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  if (storedHashedOTP !== providedHashedOtp) {
    logger.warn({ userId }, "Verify OTP failed: Invalid OTP");
    throw new AppError("Invalid OTP", 401);
  }

  await query("UPDATE users SET is_verified = true WHERE id = $1", [userId]);

  await redis.del(`otp:${userId}`);
  await redis.del(attemptsKey);
  await redis.del(`otp_ratelimit:${userId}`);

  return { id: userId };
}
