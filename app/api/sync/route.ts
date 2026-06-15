import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonCacheResponse } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

const syncCacheHeaders = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

function getSyncErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown sync error';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 250) : 100;
    const requestedDatasets = new Set(
      searchParams
        .getAll('dataset')
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean),
    );

    const syncQueries = {
      users: () => prisma.user.findMany({
        include: {
          teacher: true,
          parent: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      parents: () => prisma.parent.findMany({
        include: {
          user: true,
          children: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      students: () => prisma.student.findMany({
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
      teachers: () => prisma.teacher.findMany({
        include: {
          user: true,
          teacherAttendances: {
            orderBy: { checkIn: 'desc' },
            take: 10,
          },
          _count: {
            select: { attendances: true, teacherAttendances: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      therapyPackages: () => prisma.therapyPackage.findMany({
        include: {
          student: true,
          program: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      studentAttendances: () => prisma.attendance.findMany({
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
      teacherAttendances: () => prisma.teacherAttendance.findMany({
        include: {
          teacher: {
            include: { user: true },
          },
        },
        orderBy: { checkIn: 'desc' },
        take: limit,
      }),
      programs: () => prisma.program.findMany({
        orderBy: { name: 'asc' },
      }),
      notifications: () => prisma.notification.findMany({
        include: {
          student: true,
          teacher: {
            include: { user: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      dailyReports: () => prisma.dailyReport.findMany({
        orderBy: { date: 'desc' },
        take: limit,
      }),
    };

    const syncEntries = [];

    for (const [name, query] of Object.entries(syncQueries)) {
      if (requestedDatasets.size > 0 && !requestedDatasets.has(name)) {
        syncEntries.push([name, { data: [], error: null }] as const);
        continue;
      }

      try {
        syncEntries.push([name, { data: await query(), error: null }] as const);
      } catch (error) {
        console.error(`Error syncing ${name}:`, error);
        syncEntries.push([name, { data: [], error: getSyncErrorMessage(error) }] as const);
      }
    }

    const syncResults = Object.fromEntries(syncEntries) as Record<
      keyof typeof syncQueries,
      { data: unknown[]; error: string | null }
    >;
    const syncErrors = Object.entries(syncResults)
      .filter(([, result]) => result.error)
      .map(([name, result]) => ({ dataset: name, error: result.error }));

    if (syncErrors.length === Object.keys(syncQueries).length) {
      return NextResponse.json(
        { error: 'Gagal sinkronisasi data production.', syncErrors },
        { status: 500, headers: noStoreHeaders },
      );
    }

    const users = syncResults.users.data;
    const parents = syncResults.parents.data;
    const students = syncResults.students.data;
    const teachers = syncResults.teachers.data;
    const therapyPackages = syncResults.therapyPackages.data;
    const studentAttendances = syncResults.studentAttendances.data;
    const teacherAttendances = syncResults.teacherAttendances.data;
    const programs = syncResults.programs.data;
    const notifications = syncResults.notifications.data;
    const dailyReports = syncResults.dailyReports.data;

    return jsonCacheResponse(
      request,
      {
        ok: syncErrors.length === 0,
        syncedAt: new Date().toISOString(),
        source: 'prisma',
        database: 'shared',
        syncErrors,
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
      syncCacheHeaders,
    );
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      { error: 'Gagal sinkronisasi data.' },
      { status: 500, headers: noStoreHeaders },
    );
  } finally {
    await prisma.$disconnect().catch((error) => {
      console.error('Error disconnecting Prisma after sync:', error);
    });
  }
}
