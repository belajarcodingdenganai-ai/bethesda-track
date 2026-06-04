'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma, ProgramType } from '@prisma/client';
import { THERAPIST_NAMES } from '@/lib/therapy-options';

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

async function getNextTeacherRegistrationNo(tx: any) {
  const teachers = await tx.teacher.findMany({
    where: { teacherId: { startsWith: 'TCH-' } },
    select: { teacherId: true },
  });

  const highestNumber = teachers.reduce((highest: number, teacher: { teacherId: string }) => {
    const match = teacher.teacherId.match(/^TCH-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);

  return `TCH-${String(highestNumber + 1).padStart(3, '0')}`;
}

function getOptionalFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function calculateAgeFromBirthDate(dateOfBirth: Date | null) {
  if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
    return 'Tabel database belum dibuat. Jalankan sinkronisasi Prisma terlebih dahulu.';
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return 'Data dengan identitas yang sama sudah terdaftar.';
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return 'Data tidak ditemukan atau sudah dihapus.';
  }

  return error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.';
}

export async function createStudent(formData: FormData) {
  try {
    return await prisma.$transaction(async (tx) => {
      const registrationNo = await getNextStudentRegistrationNo(tx);
      const name = getOptionalFormString(formData, 'name');
      const nickname = getOptionalFormString(formData, 'nickname');
      const parentPhone = getOptionalFormString(formData, 'parentPhone');
      const gender = getOptionalFormString(formData, 'gender');
      const dateOfBirthText = getOptionalFormString(formData, 'dateOfBirth');
      const dateOfBirth = dateOfBirthText ? new Date(dateOfBirthText) : null;
      const age = calculateAgeFromBirthDate(dateOfBirth);
      const address = getOptionalFormString(formData, 'address');
      const diagnosis = getOptionalFormString(formData, 'diagnosis');
      const profileImage = getOptionalFormString(formData, 'profileImage');
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
          age,
          gender,
          address,
          diagnosis,
          profileImage,
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
      revalidatePath('/');
      revalidatePath('/sessions');
      return { success: true, data: student };
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return { success: false, error: getActionErrorMessage(error) };
  }
}

export async function updateStudent(id: string, formData: FormData) {
  try {
    const name = getOptionalFormString(formData, 'name');
    const nickname = getOptionalFormString(formData, 'nickname');
    const parentPhone = getOptionalFormString(formData, 'parentPhone');
    const gender = getOptionalFormString(formData, 'gender');
    const dateOfBirthText = getOptionalFormString(formData, 'dateOfBirth');
    const dateOfBirth = dateOfBirthText ? new Date(dateOfBirthText) : null;
    const age = calculateAgeFromBirthDate(dateOfBirth);
    const address = getOptionalFormString(formData, 'address');
    const diagnosis = getOptionalFormString(formData, 'diagnosis');
    const profileImage = getOptionalFormString(formData, 'profileImage');

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
        age,
        address,
        diagnosis,
        profileImage,
      },
    });

    revalidatePath('/students');
    revalidatePath('/');
    revalidatePath('/sessions');
    revalidatePath(`/students/${id}`);
    return { success: true, data: student };
  } catch (error: any) {
    return { success: false, error: getActionErrorMessage(error) };
  }
}

export async function deleteStudent(id: string) {
  try {
    await prisma.student.delete({
      where: { id },
    });

    revalidatePath('/students');
    revalidatePath('/');
    revalidatePath('/sessions');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getActionErrorMessage(error) };
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
    const therapistName = getOptionalFormString(formData, 'therapistId');
    const scheduleTime = getOptionalFormString(formData, 'scheduleTime');

    if (!programName || frequency <= 0) throw new Error('Data paket tidak lengkap.');
    if (!therapistName) throw new Error('Terapis wajib dipilih.');
    if (!scheduleTime) throw new Error('Jadwal sesi wajib dipilih.');

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
          therapistName,
          scheduleTime,
          status: 'ACTIVE',
        }
      });

      revalidatePath('/students');
      revalidatePath('/');
      revalidatePath('/sessions');
      return { success: true, data: newPackage };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPrograms() {
  try {
    const programs = await prisma.program.findMany({
      include: {
        _count: {
          select: {
            studentPrograms: true,
            packages: true,
            attendances: true
          }
        }
      },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: programs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProgram(id: string) {
  try {
    await prisma.program.delete({
      where: { id },
    });
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getActionErrorMessage(error) };
  }
}

export async function createTeacher(formData: FormData) {
  try {
    const name = getOptionalFormString(formData, 'name');
    const email = getOptionalFormString(formData, 'email');
    const phone = getOptionalFormString(formData, 'phone');
    const division = getOptionalFormString(formData, 'division');
    const position = getOptionalFormString(formData, 'position');
    const profileImage = getOptionalFormString(formData, 'profileImage');

    if (!name) throw new Error('Nama guru wajib diisi.');
    if (!email) throw new Error('Email guru wajib diisi.');
    if (!division) throw new Error('Divisi wajib diisi.');
    if (!position) throw new Error('Jabatan wajib diisi.');

    return await prisma.$transaction(async (tx) => {
      const teacherId = await getNextTeacherRegistrationNo(tx);

      // 1. Create User Account
      const user = await tx.user.create({
        data: {
          name,
          email,
          role: 'TEACHER',
          profileImage,
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
          qrCode: `TEACHER-${teacherId}`,
        },
        include: { user: true },
      });

      revalidatePath('/teachers');
      revalidatePath('/');
      revalidatePath('/teacher-scanner');
      revalidatePath('/reports');
      return { success: true, data: teacher };
    });
  } catch (error: any) {
    return { success: false, error: getActionErrorMessage(error) };
  }
}

export async function syncDefaultTherapists() {
  try {
    const teachers = [];

    for (const [index, name] of THERAPIST_NAMES.entries()) {
      const teacherId = `TCH-${String(index + 1).padStart(3, '0')}`;
      const emailName = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '');
      const email = `${emailName}@bethesda.com`;

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          role: 'TEACHER',
        },
        create: {
          email,
          name,
          role: 'TEACHER',
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

    revalidatePath('/teachers');
    revalidatePath('/');
    revalidatePath('/teacher-scanner');
    revalidatePath('/reports');
    return { success: true, data: teachers };
  } catch (error: any) {
    return { success: false, error: getActionErrorMessage(error) };
  }
}

export async function updateTeacher(id: string, formData: FormData) {
  try {
    const name = getOptionalFormString(formData, 'name');
    const email = getOptionalFormString(formData, 'email');
    const phone = getOptionalFormString(formData, 'phone');
    const division = getOptionalFormString(formData, 'division');
    const position = getOptionalFormString(formData, 'position');
    const profileImage = getOptionalFormString(formData, 'profileImage');

    if (!name) throw new Error('Nama guru wajib diisi.');
    if (!email) throw new Error('Email guru wajib diisi.');
    if (!division) throw new Error('Divisi wajib diisi.');
    if (!position) throw new Error('Jabatan wajib diisi.');

    return await prisma.$transaction(async (tx) => {
      const existingTeacher = await tx.teacher.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!existingTeacher) throw new Error('Data guru tidak ditemukan.');

      await tx.user.update({
        where: { id: existingTeacher.userId },
        data: { name, email, profileImage },
      });

      const teacher = await tx.teacher.update({
        where: { id },
        data: {
          phone,
          division,
          position,
        },
        include: { user: true },
      });

      revalidatePath('/teachers');
      revalidatePath('/');
      revalidatePath('/teacher-scanner');
      revalidatePath('/reports');
      return { success: true, data: teacher };
    });
  } catch (error: any) {
    return { success: false, error: getActionErrorMessage(error) };
  }
}

export async function deleteTeacher(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!teacher) throw new Error('Data guru tidak ditemukan.');

      await tx.user.delete({
        where: { id: teacher.userId },
      });
    });

    revalidatePath('/teachers');
    revalidatePath('/');
    revalidatePath('/teacher-scanner');
    revalidatePath('/reports');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getActionErrorMessage(error) };
  }
}
