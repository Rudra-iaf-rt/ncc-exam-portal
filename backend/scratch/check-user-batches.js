const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

async function test() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT DISTINCT batch FROM \"User\" WHERE batch IS NOT NULL");
    console.log("Batches in User table:", res.rows.map(r => r.batch));
  } catch (err) {
    console.error("Failed to fetch user batches:", err.message);
  } finally {
    await pool.end();
  }
}

test();
