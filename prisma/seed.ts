import { PrismaClient, ProgramType, UserRole } from '@prisma/client';
import { THERAPIST_NAMES, THERAPY_SCHEDULES } from '../lib/therapy-options';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bethesda.com' },
    update: {},
    create: {
      email: 'admin@bethesda.com',
      name: 'Admin',
      role: UserRole.ADMIN,
    },
  });

  console.log('✅ Admin created:', admin.id);

  // Create therapists with sequential IDs and QR codes
  const teachers = [];
  for (const [index, name] of THERAPIST_NAMES.entries()) {
    const teacherId = `TCH-${String(index + 1).padStart(3, '0')}`;
    const emailName = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '');
    const user = await prisma.user.upsert({
      where: { email: `${emailName}@bethesda.com` },
      update: {
        name,
        role: UserRole.TEACHER,
      },
      create: {
        email: `${emailName}@bethesda.com`,
        name,
        role: UserRole.TEACHER,
      },
    });

    const teacher = await prisma.teacher.upsert({
      where: { teacherId },
      update: {
        userId: user.id,
        division: 'Terapis',
        position: 'Terapis',
        qrCode: `TEACHER-${teacherId}`,
      },
      create: {
        userId: user.id,
        teacherId,
        division: 'Terapis',
        position: 'Terapis',
        qrCode: `TEACHER-${teacherId}`,
      },
      include: { user: true },
    });

    teachers.push(teacher);
  }

  console.log(`✅ ${teachers.length} therapists created`);

  // Create programs
  const programs = [];
  for (const program of Object.values(ProgramType)) {
    const p = await prisma.program.upsert({
      where: { name: program },
      update: {},
      create: {
        name: program,
        description: `${program} Therapy Program`,
      },
    });
    programs.push(p);
  }

  console.log('✅ Programs created');

  // Create parent
  const parent = await prisma.user.upsert({
    where: { email: 'parent@bethesda.com' },
    update: {},
    create: {
      email: 'parent@bethesda.com',
      name: 'John Smith',
      role: UserRole.PARENT,
      parent: {
        create: {
          phone: '08901234567',
        },
      },
    },
    include: { parent: true },
  });

  console.log('✅ Parent created');

  // Create students
  const students = [];
  const studentNames = [
    { name: 'Nathan', nickname: 'Nat', registration: 'STU-0001' },
    { name: 'Emma', nickname: 'Em', registration: 'STU-0002' },
    { name: 'Lucas', nickname: 'Luc', registration: 'STU-0003' },
    { name: 'Olivia', nickname: 'Liv', registration: 'STU-0004' },
    { name: 'Ava', nickname: 'A', registration: 'STU-0005' },
  ];

  for (let i = 0; i < studentNames.length; i++) {
    const student = await prisma.student.create({
      data: {
        registrationNo: studentNames[i].registration,
        name: studentNames[i].name,
        nickname: studentNames[i].nickname,
        qrCode: studentNames[i].registration,
        gender: i % 2 === 0 ? 'male' : 'female',
        dateOfBirth: new Date(`2015-0${(i % 9) + 1}-${(i % 28) + 1}`),
        age: 8 + i,
        address: `Street ${i + 1}, Jakarta`,
        parentPhone: '08901234567',
        parentEmail: 'parent@bethesda.com',
        school: 'Rumah Bethesda',
        diagnosis: ['Autism', 'Dyslexia', 'ADHD', 'Speech Delay', 'Sensory'][i % 5],
        status: 'ACTIVE',
        parentId: parent.parent?.id,
      },
    });
    students.push(student);
  }

  console.log(`✅ ${students.length} students created`);

  // Assign programs to students
  for (const student of students) {
    await prisma.studentProgram.create({
      data: {
        studentId: student.id,
        programId: programs[0].id,
        startDate: new Date(),
      },
    });
  }

  console.log('✅ Student programs assigned');

  // Create therapy packages
  for (const student of students) {
    await prisma.therapyPackage.create({
      data: {
        studentId: student.id,
        programId: programs[0].id,
        frequency: 2,
        totalSessions: 8,
        usedSessions: 3,
        therapistName: teachers[0].user.name,
        scheduleTime: THERAPY_SCHEDULES[0],
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Therapy packages created');

  // Create some sample attendance records
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const pkg = await prisma.therapyPackage.findFirst({
      where: { studentId: student.id },
    });

    if (pkg) {
      const checkInTime = new Date();
      checkInTime.setHours(9 + i, 0, 0, 0);

      const checkOutTime = new Date(checkInTime);
      checkOutTime.setHours(10 + i, 0, 0, 0);

      await prisma.attendance.create({
        data: {
          studentId: student.id,
          teacherId: teachers[i % teachers.length].id,
          programId: programs[0].id,
          packageId: pkg.id,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          duration: 60,
          room: `Room ${(i % 5) + 1}`,
          status: 'PRESENT',
          qrCodeScanned: student.qrCode,
        },
      });
    }
  }

  console.log('✅ Sample attendance records created');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
