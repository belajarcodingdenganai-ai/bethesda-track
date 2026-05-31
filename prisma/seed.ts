import { PrismaClient, ProgramType, UserRole } from '@prisma/client';

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

  // Create teachers
  const teacher1 = await prisma.user.upsert({
    where: { email: 'sarah@bethesda.com' },
    update: {},
    create: {
      email: 'sarah@bethesda.com',
      name: 'Sarah Johnson',
      role: UserRole.TEACHER,
      teacher: {
        create: {
          teacherId: 'TCH-0001',
          division: 'ABA Division',
          position: 'Senior Therapist',
          phone: '082234567890',
          qrCode: 'TCH-0001',
        },
      },
    },
    include: { teacher: true },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: 'david@bethesda.com' },
    update: {},
    create: {
      email: 'david@bethesda.com',
      name: 'David Lee',
      role: UserRole.TEACHER,
      teacher: {
        create: {
          teacherId: 'TCH-0002',
          division: 'Speech Therapy',
          position: 'Speech Therapist',
          phone: '081345678901',
          qrCode: 'TCH-0002',
        },
      },
    },
    include: { teacher: true },
  });

  console.log('✅ Teachers created');

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
        school: 'Bethesda Special School',
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
          teacherId: i % 2 === 0 ? teacher1.teacher!.id : teacher2.teacher!.id,
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
