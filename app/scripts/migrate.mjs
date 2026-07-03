// One-shot database migrator for production (RDS).
//
// Runs on the EC2 host (which can reach RDS) as a short-lived container before
// the app starts. It is safe to run repeatedly:
//   1. Ensures the pgvector extension exists.
//   2. If the database was migrated by hand BEFORE Drizzle migration tracking
//      existed, it "baselines" the already-applied migrations so Drizzle does
//      not try to re-create existing tables (which would abort the deploy).
//   3. Applies any pending migrations via Drizzle's programmatic migrator.
//
// Requires DATABASE_URL in the environment.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "src", "lib", "db", "migrations");

// Managed Postgres (RDS) requires TLS, but postgres.js does not enable SSL by
// default. Turn it on for non-local hosts. `rejectUnauthorized: false` encrypts
// the connection without pinning the RDS CA bundle (fine within a VPC).
function sslOptions(url) {
  const isLocal = /@(localhost|127\.0\.0\.1|db|postgres)[:/]/.test(url);
  return isLocal ? {} : { ssl: { rejectUnauthorized: false } };
}

// Ordered probes that tell us whether a given migration is already applied, so
// we can baseline a pre-existing database. Each probe returns a boolean column
// named "applied". Keep in sync with the migration files.
const PROBES = {
  "0000_round_captain_america":
    `SELECT to_regclass('public.users') IS NOT NULL AS applied`,
  "0001_freezing_shriek":
    `SELECT to_regclass('public.chunks') IS NOT NULL AS applied`,
  "0002_curious_albert_cleary":
    `SELECT to_regclass('public.conversations') IS NOT NULL AS applied`,
  // pgvector stores the dimension directly in atttypmod; 768 == migration 0003.
  "0003_curved_hawkeye":
    `SELECT COALESCE((
       SELECT a.atttypmod = 768
       FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       WHERE c.relname = 'chunks' AND a.attname = 'embedding' AND NOT a.attisdropped
     ), false) AS applied`,
};

function readJournal() {
  const raw = readFileSync(join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8");
  return JSON.parse(raw).entries.sort((a, b) => a.idx - b.idx);
}

async function ensureVectorExtension(sql) {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log("[migrate] pgvector extension ensured.");
  } catch (err) {
    // On managed Postgres the connecting role may lack privilege. Surface it
    // but continue — the extension may already have been created by an admin.
    console.warn(`[migrate] Could not ensure pgvector extension: ${err.message}`);
  }
}

async function baselineIfNeeded(sql) {
  const [{ present }] = await sql`
    SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present
  `;
  if (present) {
    console.log("[migrate] Drizzle migration tracking already present — skipping baseline.");
    return;
  }

  const journal = readJournal();
  const applied = [];
  for (const entry of journal) {
    const probe = PROBES[entry.tag];
    if (!probe) break;
    const [row] = await sql.unsafe(probe);
    if (row?.applied) applied.push(entry);
    else break; // stop at the first not-yet-applied migration
  }

  if (applied.length === 0) {
    console.log("[migrate] Fresh database — no baseline needed.");
    return;
  }

  console.log(
    `[migrate] Existing un-tracked database detected. Baselining ${applied.length} ` +
    `already-applied migration(s): ${applied.map((e) => e.tag).join(", ")}`
  );
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;
  for (const entry of applied) {
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${"baseline_" + entry.tag}, ${entry.when})
    `;
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[migrate] DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, ...sslOptions(url) });
  try {
    await ensureVectorExtension(sql);
    await baselineIfNeeded(sql);

    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.log("[migrate] Migrations applied successfully.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[migrate] Migration failed:", err);
  process.exit(1);
});
