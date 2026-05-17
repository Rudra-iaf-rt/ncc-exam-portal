const { Pool } = require("pg");
require("dotenv").config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT id, email, role, "regimentalNumber" FROM "User"');
    console.log("Seeded Users in DB:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Query failed:", err.message);
  } finally {
    await pool.end();
  }
}

run();
