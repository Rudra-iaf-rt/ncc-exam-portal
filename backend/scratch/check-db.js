const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

async function test() {
  console.log("Testing connection to:", connectionString);
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Tables found:", res.rows.map(r => r.table_name));
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await pool.end();
  }
}

test();
