import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Postgres connection + Drizzle ORM client.
 *
 * Uses the `postgres` driver (by Porsager) — modern, ESM, lightweight.
 * Connection string comes from DATABASE_URL env var.
 *
 * Note: We lazily read DATABASE_URL to avoid import-time env validation
 * issues during build/codegen. The env module validates at runtime.
 */
const connectionString = process.env.DATABASE_URL!;

// For query purposes (connection pool)
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
