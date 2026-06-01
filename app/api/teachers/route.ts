import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPrismaErrorMessage, prismaErrorResponse } from '@/lib/prisma-errors';

async function getNextTeacherRegistrationNo() {
  const teachers = await prisma.teacher.findMany({
    where: { teacherId: { startsWith: 'TCH-' } },
    select: { teacherId: true },
  });

  const highestNumber = teachers.reduce((highest, teacher) => {
    const match = teacher.teacherId.match(/^TCH-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);

  return `TCH-${String(highestNumber + 1).padStart(3, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: true,
        _count: {
          select: {
            attendances: true,
            attendanceLogs: true,
          },
        },
        attendanceLogs: {
          orderBy: { checkIn: 'desc' },
          take: 5,
        },
      },
      orderBy: { userId: 'asc' },
    });

    return NextResponse.json({
      data: teachers.map((t) => ({
        ...t,
        name: t.user?.name,
        latestAttendance: t.attendanceLogs[0] || null,
      })),
      total: teachers.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      }
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return prismaErrorResponse(error, 'Failed to fetch teachers');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const teacherId = body.teacherId || await getNextTeacherRegistrationNo();

    const teacher = await prisma.teacher.create({
      data: {
        teacherId,
        division: body.division,
        position: body.position,
        phone: body.phone,
        qrCode: body.qrCode || `TEACHER-${teacherId}`,
        user: {
          create: {
            email: body.email,
            name: body.name,
            role: 'TEACHER',
          },
        },
      },
    });

    return NextResponse.json(teacher, { status: 201 });
  } catch (error: any) {
    console.error('Error creating teacher:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Teacher ID or QR code already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: getPrismaErrorMessage(error) || 'Failed to create teacher' }, { status: 500 });
  }
}
