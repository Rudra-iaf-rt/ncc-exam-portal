const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

async function test() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT migration_name, applied_steps_count FROM \"_prisma_migrations\"");
    console.log("Migrations in DB:", res.rows);
  } catch (err) {
    console.error("Failed to fetch migrations:", err.message);
  } finally {
    await pool.end();
  }
}

test();
