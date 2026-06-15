import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createParentPortalSlug, verifyParentPortalToken } from '@/lib/parent-portal';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { getSchoolProgramChecklistWithSummary, resolveSchoolStudentAliases } from '@/lib/school-program-checklists';
import { getProjectFlowStudentAssignment } from '@/lib/projectflow';
import { jsonCacheResponse } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

const parentPortalCacheHeaders = {
  'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
};

async function resolveSchoolStudentId(tokenOrSlug: string) {
  const payload = verifyParentPortalToken(tokenOrSlug);
  if (payload?.studentId) return payload.studentId;

  const students = await prisma.student.findMany({
    where: {
      status: 'ACTIVE',
      studentTrack: 'SCHOOL',
    },
    select: {
      id: true,
      name: true,
    },
  });

  return students.find((student) => createParentPortalSlug(student.name) === tokenOrSlug)?.id || null;
}

function compactProgramChecklist(checklist: any) {
  if (!checklist) return null;

  return {
    studentName: checklist.studentName,
    description: checklist.description || '',
    summary: checklist.summary,
    projectFlowCards: (checklist.projectFlowCards || []).map((card: any) => ({
      id: card.id,
      title: card.title,
      boardTitle: card.boardTitle,
      scheduleTime: card.scheduleTime,
      updatedAt: card.updatedAt,
    })),
    sections: (checklist.sections || []).map((section: any) => ({
      title: section.title,
      scheduleTime: section.scheduleTime,
      items: (section.items || []).map((item: any) => ({
        text: item.text,
        done: Boolean(item.done),
        status: item.status || null,
      })),
    })),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const studentId = await resolveSchoolStudentId(token);

    if (!studentId) {
      return NextResponse.json({ error: 'Link parent portal sekolah tidak valid.' }, { status: 401, headers: noStoreHeaders });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        status: 'ACTIVE',
        studentTrack: 'SCHOOL',
      },
      select: {
        id: true,
        registrationNo: true,
        name: true,
        nickname: true,
        schoolTeacherName: true,
        attendances: {
          take: 1,
          orderBy: { checkIn: 'desc' },
          select: {
            teacher: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Data portal parent sekolah tidak ditemukan.' }, { status: 404, headers: noStoreHeaders });
    }

    const aliases = resolveSchoolStudentAliases(student.name);
    const [projectFlowAssignment, programChecklist] = await Promise.all([
      getProjectFlowStudentAssignment(student.name, 'SCHOOL', aliases),
      getSchoolProgramChecklistWithSummary(student.name),
    ]);
    const projectFlowAssignee = projectFlowAssignment?.assignees?.[0] || null;
    const latestAttendanceTeacher = student.attendances[0]?.teacher || null;
    const teacherName = projectFlowAssignment?.primaryTeacherName || latestAttendanceTeacher?.user?.name || student.schoolTeacherName || 'ESTER WARUWU';
    const teacher = await prisma.teacher.findFirst({
      where: {
        user: {
          name: {
            equals: teacherName,
            mode: 'insensitive',
          },
        },
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonCacheResponse(request, {
      student: {
        id: student.id,
        registrationNo: student.registrationNo,
        name: student.name,
        nickname: student.nickname,
        profileImage: null,
        schoolTeacherName: teacherName,
        schoolSchedule: projectFlowAssignment?.scheduleTime || programChecklist?.projectFlowCard?.scheduleTime || '08:00-12:00',
        programChecklist: compactProgramChecklist(programChecklist),
        teacherProfile: teacher
          ? {
              id: teacher.id,
              name: teacher.user?.name || teacherName,
              profileImage: null,
            }
          : projectFlowAssignee
            ? {
                id: projectFlowAssignee.id,
                name: projectFlowAssignee.name,
                profileImage: null,
              }
            : latestAttendanceTeacher
              ? {
                  id: latestAttendanceTeacher.id,
                  name: latestAttendanceTeacher.user?.name || teacherName,
                  profileImage: null,
                }
            : {
                id: null,
                name: teacherName,
                profileImage: null,
              },
      },
    }, parentPortalCacheHeaders);
  } catch (error) {
    console.error('Error fetching school parent portal:', error);
    return prismaErrorResponse(error, 'Gagal memuat parent portal sekolah');
  }
}
