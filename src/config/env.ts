import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().optional(),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  DB_SSL: z
    .preprocess((value) => value === "true" || value === "1" || value === true, z.boolean())
    .default(true),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES: z.string().default("7d"),

  REDIS_URL: z.url().default("redis://localhost:6379"),

  RESEND_API_KEY: z.string().optional(),
  RESEND_MAIL: z.email().optional(),

  CORS_ORIGINS: z.string().optional().default("http://localhost:3000"),

  ADMIN_EMAIL: z.email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration", parsed.error.format());
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export type AppEnvironment = typeof env;
