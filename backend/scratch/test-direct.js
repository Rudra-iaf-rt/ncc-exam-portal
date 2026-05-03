
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const connectionString = "postgresql://neondb_owner:npg_5HzyEUl4tCaG@ep-dawn-moon-anzejqj0.us-east-1.aws.neon.tech/neondb?sslmode=require";
console.log('Testing DIRECT connection string:', connectionString);

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Testing connection...');
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log('Connection successful:', result);
  } catch (err) {
    console.error('Connection failed:', JSON.stringify(err, null, 2));
    console.error('Full Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
