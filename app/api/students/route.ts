import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPrismaErrorMessage, prismaErrorResponse } from '@/lib/prisma-errors';
import { revalidatePath } from 'next/cache';
import { ProgramType } from '@prisma/client';
import { jsonCacheResponse } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

const listCacheHeaders = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
};

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

async function getNextStudentRegistrationNo() {
  const students = await prisma.student.findMany({
    where: { registrationNo: { startsWith: 'BETH-' } },
    select: { registrationNo: true },
  });

  const highestNumber = students.reduce((highest, student) => {
    const match = student.registrationNo.match(/^BETH-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);

  return `BETH-${String(highestNumber + 1).padStart(3, '0')}`;
}

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

function normalizeProgramList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const track = searchParams.get('track') || 'THERAPY';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (track !== 'ALL') {
      where.studentTrack = track === 'SCHOOL' ? 'SCHOOL' : 'THERAPY';
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          id: true,
          registrationNo: true,
          name: true,
          nickname: true,
          gender: true,
          age: true,
          dateOfBirth: true,
          address: true,
          diagnosis: true,
          profileImage: true,
          status: true,
          studentTrack: true,
          parentPhone: true,
          qrCode: true,
          packages: {
            where: {
              status: { in: ['ACTIVE', 'WARNING'] },
            },
            select: {
              id: true,
              totalSessions: true,
              usedSessions: true,
              status: true,
              program: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              attendances: true,
              packages: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.student.count({ where }),
    ]);

    return jsonCacheResponse(request, {
      data: students,
      total,
      limit,
      offset,
    }, listCacheHeaders);
  } catch (error) {
    console.error('Error fetching students:', error);
    return prismaErrorResponse(error, 'Failed to fetch students');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const registrationNo = body.registrationNo || await getNextStudentRegistrationNo();
    const qrCode = body.qrCode || `STU-${registrationNo}`;
    const programNames = normalizeProgramList(body.programs);
    const frequency = Number.parseInt(String(body.frequency || ''), 10);
    const totalSessions = Number.parseInt(String(body.totalSessions || ''), 10);

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Nama siswa wajib diisi.' }, { status: 400, headers: noStoreHeaders });
    }

    const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    const age = calculateAgeFromBirthDate(dateOfBirth);

    const student = await prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          registrationNo,
          name: body.name.trim(),
          nickname: body.nickname || null,
          gender: body.gender || null,
          dateOfBirth,
          age,
          address: body.address || null,
          parentPhone: body.parentPhone || null,
          parentEmail: body.parentEmail || null,
          school: body.school || null,
          diagnosis: body.diagnosis || null,
          profileImage: body.profileImage || null,
          qrCode,
          status: body.status || 'ACTIVE',
          studentTrack: body.studentTrack === 'SCHOOL' ? 'SCHOOL' : 'THERAPY',
        },
      });

      if (programNames.length > 0 && Number.isFinite(frequency) && frequency > 0) {
        for (const programName of programNames) {
          const enumName = normalizeProgramName(programName);
          if (!enumName) throw new Error(`Program terapi tidak valid: ${programName}`);

          const program = await tx.program.upsert({
            where: { name: enumName },
            update: {},
            create: {
              name: enumName,
              description: PROGRAM_LABELS[enumName],
            },
          });

          await tx.studentProgram.upsert({
            where: {
              studentId_programId: {
                studentId: createdStudent.id,
                programId: program.id,
              },
            },
            update: {},
            create: {
              studentId: createdStudent.id,
              programId: program.id,
            },
          });

          await tx.therapyPackage.create({
            data: {
              studentId: createdStudent.id,
              programId: program.id,
              frequency,
              totalSessions: Number.isFinite(totalSessions) && totalSessions > 0 ? totalSessions : frequency * 4,
              therapistName: body.therapistName || body.therapistId || null,
              scheduleTime: body.scheduleTime || null,
              status: 'ACTIVE',
            },
          });
        }
      }

      return createdStudent;
    });

    revalidatePath('/');
    revalidatePath('/students');
    revalidatePath('/students/school');
    revalidatePath('/sessions');

    return NextResponse.json(student, { status: 201, headers: noStoreHeaders });
  } catch (error: any) {
    console.error('Error creating student:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Registration number or QR code already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: getPrismaErrorMessage(error) || 'Failed to create student' }, { status: 500 });
  }
}
