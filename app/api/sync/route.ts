import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '250', 10), 1000);

    const [
      students,
      teachers,
      therapyPackages,
      studentAttendances,
      teacherAttendances,
      programs,
    ] = await Promise.all([
      prisma.student.findMany({
        include: {
          programs: { include: { program: true } },
          packages: {
            include: { program: true },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { attendances: true, packages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      prisma.teacher.findMany({
        include: {
          user: true,
          attendanceLogs: {
            orderBy: { checkIn: 'desc' },
            take: 10,
          },
          _count: {
            select: { attendances: true, attendanceLogs: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      prisma.therapyPackage.findMany({
        include: {
          student: true,
          program: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      prisma.attendance.findMany({
        include: {
          student: true,
          program: true,
          package: true,
          teacher: {
            include: { user: true },
          },
        },
        orderBy: { checkIn: 'desc' },
        take: limit,
      }),
      prisma.teacherAttendance.findMany({
        include: {
          teacher: {
            include: { user: true },
          },
        },
        orderBy: { checkIn: 'desc' },
        take: limit,
      }),
      prisma.program.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json(
      {
        syncedAt: new Date().toISOString(),
        students,
        teachers,
        therapyPackages,
        studentAttendances,
        teacherAttendances,
        programs,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      { error: 'Gagal sinkronisasi data.' },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
