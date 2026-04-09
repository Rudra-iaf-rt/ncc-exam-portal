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
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Demo Admin",
      regimentalNumber: null,
      email: "admin@example.com",
      password: staffPass,
      role: "ADMIN",
      college: "Demo College",
    },
  });

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
    },
  });

  console.log("Seed OK: STU001 / student123, admin@example.com & instructor@example.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
