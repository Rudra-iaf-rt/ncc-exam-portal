
const { Pool } = require("pg");

const connectionString = "postgresql://neondb_owner:npg_5HzyEUl4tCaG@ep-dawn-moon-anzejqj0.us-east-1.aws.neon.tech/neondb?sslmode=require";
console.log('Testing DIRECT connection string with PG directly:', connectionString);

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Testing connection...');
    const client = await pool.connect();
    const res = await client.query('SELECT 1');
    console.log('Connection successful:', res.rows);
    client.release();
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await pool.end();
  }
}

main();
