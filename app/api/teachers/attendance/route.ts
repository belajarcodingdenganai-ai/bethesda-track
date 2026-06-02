import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { prismaErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function getJakartaDateRange(startDate: string | null, endDate: string | null) {
  const where: { gte?: Date; lte?: Date } = {};

  if (startDate) {
    where.gte = new Date(`${startDate}T00:00:00.000+07:00`);
  }

  if (endDate) {
    where.lte = new Date(`${endDate}T23:59:59.999+07:00`);
  }

  return where;
}

function isJakartaWeekday(value: Date) {
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
  }).format(value);

  return !['Sat', 'Sun'].includes(dayName);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const teacherId = searchParams.get('teacherId');
    const dateRange = getJakartaDateRange(startDate, endDate);

    const where: any = {};

    if (Object.keys(dateRange).length > 0) {
      where.checkIn = dateRange;
    }

    if (teacherId && teacherId !== 'ALL') {
      where.teacherId = teacherId;
    }

    const attendance = await prisma.teacherAttendance.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    const weekdayAttendance = attendance.filter((item) => isJakartaWeekday(item.checkIn));

    return NextResponse.json(
      {
        data: weekdayAttendance.map((item) => ({
          id: item.id,
          teacherDbId: item.teacherId,
          teacherId: item.teacher.teacherId,
          teacherName: item.teacher.user?.name || item.teacher.teacherId,
          email: item.teacher.user?.email || '',
          division: item.teacher.division,
          position: item.teacher.position,
          attendanceDate: item.attendanceDate,
          scheduledStart: item.scheduledStart,
          checkIn: item.checkIn,
          isLate: item.isLate,
          minutesLate: item.minutesLate,
          notes: item.notes,
        })),
        total: weekdayAttendance.length,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error('Error fetching teacher attendance:', error);
    return prismaErrorResponse(error, 'Failed to fetch teacher attendance');
  }
}
