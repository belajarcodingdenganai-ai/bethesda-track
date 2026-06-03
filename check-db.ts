import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const studentCount = await prisma.student.count();
    const teacherCount = await prisma.teacher.count();
    console.log(`Database connected successfully.`);
    console.log(`Student Count: ${studentCount}`);
    console.log(`Teacher Count: ${teacherCount}`);
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
