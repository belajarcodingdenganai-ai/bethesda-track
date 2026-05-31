'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ProgramType } from '@prisma/client';

const PROGRAM_LABELS: Record<ProgramType, string> = {
  ABA: 'Applied Behavior Analysis',
  SI: 'Sensory Integration',
  SPEECH: 'Speech Therapy',
  OT: 'Occupational Therapy',
  ACADEMIC: 'Academic Support',
};

function normalizeProgramName(value: string): ProgramType | null {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_');
  const aliases: Record<string, ProgramType> = {
    ABA: ProgramType.ABA,
    SI: ProgramType.SI,
    SENSORY: ProgramType.SI,
    SENSORY_INTEGRATION: ProgramType.SI,
    SPEECH: ProgramType.SPEECH,
    SPEECH_THERAPY: ProgramType.SPEECH,
    OT: ProgramType.OT,
    OCCUPATIONAL_THERAPY: ProgramType.OT,
    ACADEMIC: ProgramType.ACADEMIC,
    ACADEMIC_SUPPORT: ProgramType.ACADEMIC,
  };

  return aliases[normalized] || null;
}

async function getOrCreateProgram(tx: any, programName: string) {
  const enumName = normalizeProgramName(programName);
  if (!enumName) throw new Error('Program terapi tidak valid.');

  return tx.program.upsert({
    where: { name: enumName },
    update: {},
    create: {
      name: enumName,
      description: PROGRAM_LABELS[enumName],
    },
  });
}

async function getNextStudentRegistrationNo(tx: any) {
  const students = await tx.student.findMany({
    where: { registrationNo: { startsWith: 'BETH-' } },
    select: { registrationNo: true },
  });

  const highestNumber = students.reduce((highest: number, student: { registrationNo: string }) => {
    const match = student.registrationNo.match(/^BETH-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);

  return `BETH-${String(highestNumber + 1).padStart(3, '0')}`;
}

function getOptionalFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createStudent(formData: FormData) {
  try {
    return await prisma.$transaction(async (tx) => {
      const registrationNo = await getNextStudentRegistrationNo(tx);
      const name = getOptionalFormString(formData, 'name');
      const nickname = getOptionalFormString(formData, 'nickname');
      const parentPhone = getOptionalFormString(formData, 'parentPhone');
      const gender = getOptionalFormString(formData, 'gender');
      const dateOfBirth = formData.get('dateOfBirth') ? new Date(formData.get('dateOfBirth') as string) : null;
      const age = parseInt((formData.get('age') as string) || '', 10);
      const address = getOptionalFormString(formData, 'address');
      const diagnosis = getOptionalFormString(formData, 'diagnosis');
      const programsRaw = getOptionalFormString(formData, 'programs'); // "ABA, SI"
      const frequency = parseInt(formData.get('frequency') as string) || 0;

      if (!name) throw new Error('Nama siswa wajib diisi.');
      if (!parentPhone) throw new Error('WhatsApp orang tua wajib diisi.');

      // 1. Buat Data Siswa dengan format QR Code yang diminta
      const student = await tx.student.create({
        data: {
          name,
          registrationNo,
          nickname,
          parentPhone,
          dateOfBirth,
          age: Number.isFinite(age) ? age : null,
          gender,
          address,
          diagnosis,
          qrCode: `STU-${registrationNo}`, // Format: STU-BETH-001
          status: 'ACTIVE',
        },
      });

      // 2. Buat Paket Terapi Aktif jika program dipilih
      if (programsRaw && frequency > 0) {
        const selectedProgramNames = programsRaw.split(', ');
        
        for (const progName of selectedProgramNames) {
          const program = await getOrCreateProgram(tx, progName);

          await tx.studentProgram.upsert({
            where: {
              studentId_programId: {
                studentId: student.id,
                programId: program.id,
              },
            },
            update: {},
            create: {
              studentId: student.id,
              programId: program.id,
            },
          });

          await tx.therapyPackage.create({
            data: {
              studentId: student.id,
              programId: program.id,
              frequency: frequency,
              totalSessions: frequency * 4, // Otomatis hitung sesi bulanan
              status: 'ACTIVE',
            }
          });
        }
      }

      revalidatePath('/students');
      return { success: true, data: student };
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return { success: false, error: error.message };
  }
}

export async function updateStudent(id: string, formData: FormData) {
  try {
    const name = getOptionalFormString(formData, 'name');
    const nickname = getOptionalFormString(formData, 'nickname');
    const parentPhone = getOptionalFormString(formData, 'parentPhone');
    const gender = getOptionalFormString(formData, 'gender');
    const dateOfBirth = formData.get('dateOfBirth') ? new Date(formData.get('dateOfBirth') as string) : null;
    const age = parseInt((formData.get('age') as string) || '', 10);
    const address = getOptionalFormString(formData, 'address');
    const diagnosis = getOptionalFormString(formData, 'diagnosis');

    if (!name) throw new Error('Nama siswa wajib diisi.');

    const student = await prisma.student.update({
      where: { id },
      data: {
        name,
        nickname,
        parentPhone,
        parentEmail: null,
        gender,
        dateOfBirth,
        age: Number.isFinite(age) ? age : null,
        address,
        diagnosis,
      },
    });

    revalidatePath('/students');
    return { success: true, data: student };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mengambil semua paket terapi untuk manajemen
 */
export async function getTherapyPackages() {
  try {
    const packages = await prisma.therapyPackage.findMany({
      include: {
        student: true,
        program: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: packages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Menambahkan atau memperbarui paket terapi untuk siswa yang sudah ada
 */
export async function addTherapyPackage(studentId: string, formData: FormData) {
  try {
    const programName = formData.get('programs') as string;
    const frequency = parseInt(formData.get('frequency') as string) || 0;
    const totalSessions = parseInt(formData.get('totalSessions') as string) || (frequency * 4);
    const endDate = formData.get('endDate') ? new Date(formData.get('endDate') as string) : null;

    if (!programName || frequency <= 0) throw new Error('Data paket tidak lengkap.');

    return await prisma.$transaction(async (tx) => {
      const program = await getOrCreateProgram(tx, programName);

      await tx.studentProgram.upsert({
        where: {
          studentId_programId: {
            studentId,
            programId: program.id,
          },
        },
        update: {},
        create: {
          studentId,
          programId: program.id,
        },
      });

      // Selesaikan paket aktif lama untuk program yang sama jika ada
      await tx.therapyPackage.updateMany({
        where: { studentId, programId: program.id, status: { in: ['ACTIVE', 'WARNING'] } },
        data: { status: 'COMPLETED' }
      });

      const newPackage = await tx.therapyPackage.create({
        data: {
          studentId,
          programId: program.id,
          frequency,
          totalSessions,
          usedSessions: 0,
          endDate,
          status: 'ACTIVE',
        }
      });

      revalidatePath('/students');
      return { success: true, data: newPackage };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTeacher(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const teacherId = formData.get('teacherId') as string;
    const phone = formData.get('phone') as string;
    const division = formData.get('division') as string;
    const position = formData.get('position') as string;

    return await prisma.$transaction(async (tx) => {
      // 1. Create User Account
      const user = await tx.user.create({
        data: {
          name,
          email,
          role: 'TEACHER',
        },
      });

      // 2. Create Teacher Profile
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          teacherId,
          phone,
          division,
          position,
          qrCode: `TCH-${teacherId}`,
        },
      });

      revalidatePath('/teachers');
      return { success: true, data: teacher };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
