const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const admin = await prisma.user.findFirst({where: {role: 'ADMIN'}});
  const student = await prisma.user.findFirst({where: {role: 'CADET'}});
  console.log('Admin:', admin?.email, 'Student:', student?.email);
}
main().finally(() => prisma.$disconnect());
