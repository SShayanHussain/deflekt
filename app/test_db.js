const postgres = require('postgres');
const sql = postgres('postgresql://postgres:shayan12%24@deflekt-db.cajqwmia4w3x.us-east-1.rds.amazonaws.com:5432/deflekt?sslmode=require');

async function test() {
  console.log("Connecting to database...");
  try {
    await sql`select 1`;
    console.log("✅ Successfully connected to database!");
  } catch (e) {
    console.error("❌ Failed to connect:", e.message);
  } finally {
    process.exit();
  }
}

test();
