import prisma from '../lib/prisma';

const STUDENT_NAMES = [
  'Keanu',
  'Nicholas',
  'Fillson',
  'Mario',
  'Kenji',
  'Nathan',
  'Eldric Edelsteen',
  'Elrich Christian',
  'Karyn',
  'Kezia',
  'Reina',
  'Eric Lim',
  'Jose Chan',
  'Gerald',
  'Yoshiaki',
  'Gredrich',
  'Josephine',
];

const STUDENT_AGE = 5;
const PARENT_PHONE = '+6281388776653';

function getHighestBethesdaNumber(registrationNos: string[]) {
  return registrationNos.reduce((highest, registrationNo) => {
    const match = registrationNo.match(/^BETH-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const existingStudents = await tx.student.findMany({
      where: {
        OR: [
          { registrationNo: { startsWith: 'BETH-' } },
          {
            name: { in: STUDENT_NAMES },
            parentPhone: PARENT_PHONE,
          },
        ],
      },
      select: {
        name: true,
        registrationNo: true,
        parentPhone: true,
      },
    });

    let nextNumber = getHighestBethesdaNumber(existingStudents.map((student) => student.registrationNo));
    const existingRequestedNames = new Set(
      existingStudents
        .filter((student) => student.parentPhone === PARENT_PHONE)
        .map((student) => student.name.toLowerCase()),
    );

    const created = [];
    const skipped = [];

    for (const name of STUDENT_NAMES) {
      if (existingRequestedNames.has(name.toLowerCase())) {
        skipped.push(name);
        continue;
      }

      nextNumber += 1;
      const registrationNo = `BETH-${String(nextNumber).padStart(3, '0')}`;
      const student = await tx.student.create({
        data: {
          registrationNo,
          name,
          age: STUDENT_AGE,
          parentPhone: PARENT_PHONE,
          qrCode: `STU-${registrationNo}`,
          status: 'ACTIVE',
        },
        select: {
          name: true,
          registrationNo: true,
          age: true,
          parentPhone: true,
          qrCode: true,
        },
      });

      created.push(student);
    }

    return { created, skipped };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
