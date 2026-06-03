import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '250', 10), 1000);

    const [
      users,
      parents,
      students,
      teachers,
      therapyPackages,
      studentAttendances,
      teacherAttendances,
      programs,
      notifications,
      dailyReports,
    ] = await Promise.all([
      prisma.user.findMany({
        include: {
          teacher: true,
          parent: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      prisma.parent.findMany({
        include: {
          user: true,
          children: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      prisma.student.findMany({
        include: {
          parent: {
            include: { user: true },
          },
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
      prisma.notification.findMany({
        include: {
          student: true,
          teacher: {
            include: { user: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      prisma.dailyReport.findMany({
        orderBy: { date: 'desc' },
        take: limit,
      }),
    ]);

    return NextResponse.json(
      {
        syncedAt: new Date().toISOString(),
        source: 'prisma',
        database: 'shared',
        users,
        parents,
        students,
        teachers,
        therapyPackages,
        studentAttendances,
        teacherAttendances,
        programs,
        notifications,
        dailyReports,
        totals: {
          users: users.length,
          parents: parents.length,
          students: students.length,
          teachers: teachers.length,
          therapyPackages: therapyPackages.length,
          studentAttendances: studentAttendances.length,
          teacherAttendances: teacherAttendances.length,
          programs: programs.length,
          notifications: notifications.length,
          dailyReports: dailyReports.length,
        },
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
