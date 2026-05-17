const { Pool } = require("pg");
require("dotenv").config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT 
        pid,
        state,
        query,
        application_name,
        client_addr,
        backend_start
      FROM pg_stat_activity
      ORDER BY backend_start DESC
    `);
    
    console.log("Active Connections in DB:");
    console.log(JSON.stringify(res.rows, null, 2));
    
    // Also get the total connection limit and count
    const limitRes = await pool.query("SHOW max_connections");
    console.log("\nMax Connections Limit:", limitRes.rows[0].max_connections);
    console.log("Current Connection Count:", res.rows.length);
  } catch (err) {
    console.error("Query failed:", err.message);
  } finally {
    await pool.end();
  }
}

run();
