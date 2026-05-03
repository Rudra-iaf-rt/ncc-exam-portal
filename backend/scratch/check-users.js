const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

async function test() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT COUNT(*) FROM \"User\"");
    console.log("Total users:", res.rows[0].count);
  } catch (err) {
    console.error("Failed to fetch user count:", err.message);
  } finally {
    await pool.end();
  }
}

test();
