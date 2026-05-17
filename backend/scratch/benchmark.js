const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt"); // or bcrypt depending on package.json
require("dotenv").config();

async function runBenchmark() {
  console.log("=== Performance Benchmark ===");
  
  // 1. Measure Pg direct pool connection + query
  console.log("\n1. Testing raw PostgreSQL connection & simple query...");
  const poolStart = Date.now();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const rawClientStart = Date.now();
    const client = await pool.connect();
    console.log(`- Connection established in: ${Date.now() - rawClientStart}ms`);
    
    const queryStart = Date.now();
    const res = await client.query("SELECT 1 as val");
    console.log(`- Raw 'SELECT 1' execution: ${Date.now() - queryStart}ms`);
    client.release();
  } catch (err) {
    console.error("- Raw Pg error:", err.message);
  }
  
  // 2. Measure Prisma initialization + simple query
  console.log("\n2. Testing Prisma with adapter client...");
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    const prismaStart = Date.now();
    await prisma.$connect();
    console.log(`- Prisma $connect() took: ${Date.now() - prismaStart}ms`);
    
    const prismaQuery1Start = Date.now();
    const one = await prisma.$queryRawUnsafe("SELECT 1 as val");
    console.log(`- Prisma raw query 'SELECT 1': ${Date.now() - prismaQuery1Start}ms`);
    
    const prismaQuery2Start = Date.now();
    const collegesCount = await prisma.college.count();
    console.log(`- Prisma 'college.count()' (${collegesCount} colleges): ${Date.now() - prismaQuery2Start}ms`);
    
    const prismaQuery3Start = Date.now();
    const usersCount = await prisma.user.count();
    console.log(`- Prisma 'user.count()' (${usersCount} users): ${Date.now() - prismaQuery3Start}ms`);
    
    const prismaQuery4Start = Date.now();
    const colleges = await prisma.college.findMany({
      orderBy: { name: 'asc' },
    });
    console.log(`- Prisma 'college.findMany()' (${colleges.length} rows): ${Date.now() - prismaQuery4Start}ms`);

    const prismaQuery5Start = Date.now();
    const counts = await prisma.user.groupBy({
      by: ['collegeCode', 'role'],
      where: {
        role: { in: ['INSTRUCTOR', 'STUDENT'] },
        collegeCode: { not: null },
      },
      _count: {
        _all: true,
      },
    });
    console.log(`- Prisma 'user.groupBy()' (${counts.length} rows): ${Date.now() - prismaQuery5Start}ms`);
  } catch (err) {
    console.error("- Prisma error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
  
  // 3. Measure Bcrypt execution time
  console.log("\n3. Testing Bcrypt CPU load (hashing and comparing)...");
  try {
    const password = "admin123";
    const rounds = 10;
    
    const hashStart = Date.now();
    const hash = await bcrypt.hash(password, rounds);
    console.log(`- Bcrypt hash (rounds: ${rounds}) took: ${Date.now() - hashStart}ms`);
    
    const compareStart = Date.now();
    const match = await bcrypt.compare(password, hash);
    console.log(`- Bcrypt compare took: ${Date.now() - compareStart}ms`);
  } catch (err) {
    console.error("- Bcrypt error:", err.message);
  }
  
  console.log("\n=== Benchmark Completed ===");
}

runBenchmark();
