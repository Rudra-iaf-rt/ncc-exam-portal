require("dotenv/config");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

async function main() {
  const studentPass = await bcrypt.hash("student123", SALT_ROUNDS);
  const staffPass = await bcrypt.hash("admin123", SALT_ROUNDS);
  const sampleCadetPass = await bcrypt.hash("Sree@1234", SALT_ROUNDS);

  // Admin user
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Demo Admin",
      regimentalNumber: null,
      email: "admin@example.com",
      password: staffPass,
      role: "ADMIN",
      college: "Unit HQ",
      isActive: true
    },
  });

  // Instructor user
  await prisma.user.upsert({
    where: { email: "instructor@example.com" },
    update: {},
    create: {
      name: "Demo Instructor",
      regimentalNumber: null,
      email: "instructor@example.com",
      password: staffPass,
      role: "INSTRUCTOR",
      college: "Demo College",
      isActive: true
    },
  });

  // Sample Cadets
  await prisma.user.upsert({
    where: { regimentalNumber: "AP2025SDAF0490515" },
    update: {
      password: sampleCadetPass,
      name: "Sample Cadet",
      college: "Demo College",
      role: "STUDENT",
      isActive: true
    },
    create: {
      name: "Sample Cadet",
      regimentalNumber: "AP2025SDAF0490515",
      email: null,
      password: sampleCadetPass,
      role: "STUDENT",
      college: "Demo College",
      isActive: true
    },
  });

  await prisma.user.upsert({
    where: { regimentalNumber: "STU001" },
    update: {},
    create: {
      name: "Demo Student",
      regimentalNumber: "STU001",
      email: null,
      password: studentPass,
      role: "STUDENT",
      college: "Demo College",
      isActive: true
    },
  });

  console.log(
    "Seed OK: AP2025SDAF0490515 / Sree@1234, STU001 / student123, admin@example.com & instructor@example.com / admin123"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });