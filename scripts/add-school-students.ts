import prisma from '../lib/prisma';

const SCHOOL_STUDENTS = [
  'Axel Gevariel',
  'Alvaro',
  'Sean',
  'Marco',
  'Jordan',
  'Jericho',
  'Benjamin',
  'Yoshiaki',
  'Lionel',
  'Juan',
  'Elleora',
  'Efraim',
  'Nathan',
  'Gio Imanuel',
  'Madeline',
  'Nina',
  'Gheovani Alexandro',
  'Kenji',
  'IeL',
  'Siska',
];

function registrationNoFor(index: number) {
  return `SCH-${String(index + 1).padStart(3, '0')}`;
}

async function main() {
  const students = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const [index, name] of SCHOOL_STUDENTS.entries()) {
      const registrationNo = registrationNoFor(index);
      const qrCode = registrationNo;

      const student = await tx.student.upsert({
        where: { registrationNo },
        update: {
          name,
          school: 'Rumah Bethesda School',
          schoolTeacherName: 'ESTER WARUWU',
          qrCode,
          status: 'ACTIVE',
          studentTrack: 'SCHOOL',
        },
        create: {
          registrationNo,
          name,
          school: 'Rumah Bethesda School',
          schoolTeacherName: 'ESTER WARUWU',
          qrCode,
          status: 'ACTIVE',
          studentTrack: 'SCHOOL',
        },
      });

      results.push({
        no: registrationNo,
        name: student.name,
        qrCode: student.qrCode,
      });
    }

    return results;
  });

  console.table(students);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
