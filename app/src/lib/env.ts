import { z } from "zod";

/**
 * Server-side environment validation.
 * Fails fast at startup if required vars are missing.
 * Import as: import { env } from "@/lib/env";
 */
const envSchema = z.object({
  // App
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Redis
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // AWS S3
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // AI Services
  OPENAI_API_KEY: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, "Secret must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "Secret must be at least 32 chars"),
  JWT_ACCESS_TTL: z.coerce.number().default(900), // 15 min
  JWT_REFRESH_TTL: z.coerce.number().default(1_209_600), // 14 days

  // AI Service
  AI_SERVICE_URL: z
    .string()
    .url()
    .default("http://localhost:8000"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export const env = validateEnv();
