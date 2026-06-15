import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createParentPortalSlug, verifyParentPortalToken } from '@/lib/parent-portal';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { getStudentProgramChecklistWithSummary, resolveStudentProgramAliases } from '@/lib/student-program-checklists';
import { getProjectFlowProgramChecklistWithSummary, getProjectFlowStudentAssignment } from '@/lib/projectflow';
import { jsonCacheResponse } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

const parentPortalCacheHeaders = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

async function resolveParentPortalStudentId(tokenOrSlug: string) {
  const payload = verifyParentPortalToken(tokenOrSlug);
  if (payload?.studentId) return payload.studentId;

  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE', studentTrack: 'THERAPY' },
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
    const studentId = await resolveParentPortalStudentId(token);

    if (!studentId) {
      return NextResponse.json({ error: 'Link parent portal tidak valid.' }, { status: 401, headers: noStoreHeaders });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        status: 'ACTIVE',
        studentTrack: 'THERAPY',
      },
      select: {
        id: true,
        registrationNo: true,
        name: true,
        nickname: true,
        age: true,
        packages: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            totalSessions: true,
            usedSessions: true,
            frequency: true,
            status: true,
            createdAt: true,
            therapistName: true,
            program: {
              select: {
                name: true,
              },
            },
          },
        },
        attendances: {
          take: 100,
          orderBy: { checkIn: 'desc' },
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            packageId: true,
            teacher: {
              select: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            program: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Data portal parent tidak ditemukan.' }, { status: 404, headers: noStoreHeaders });
    }

    const activePackage = student.packages[0];
    const aliases = resolveStudentProgramAliases(student.name);
    const [projectFlowAssignment, projectFlowChecklist] = await Promise.all([
      getProjectFlowStudentAssignment(student.name, 'THERAPY', aliases),
      getProjectFlowProgramChecklistWithSummary(student.name, 'THERAPY', aliases),
    ]);
    const localProgramChecklist = getStudentProgramChecklistWithSummary(student.name);
    const programChecklist = projectFlowChecklist?.projectFlowCard
      ? projectFlowChecklist
      : localProgramChecklist;
    const projectFlowAssignee = projectFlowAssignment?.assignees?.[0] || null;
    const therapistName = projectFlowAssignment?.primaryTeacherName || activePackage?.therapistName;
    const therapist = therapistName
      ? await prisma.teacher.findFirst({
          where: {
            user: {
              name: {
                equals: therapistName,
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
        })
      : null;

    return jsonCacheResponse(request, {
      student: {
        id: student.id,
        registrationNo: student.registrationNo,
        name: student.name,
        nickname: student.nickname,
        age: student.age,
        profileImage: null,
        packages: activePackage
          ? [
              {
                id: activePackage.id,
                totalSessions: activePackage.totalSessions,
                usedSessions: activePackage.usedSessions,
                frequency: activePackage.frequency,
                status: activePackage.status,
                createdAt: activePackage.createdAt,
                program: activePackage.program,
                therapistName,
              },
              ...student.packages.slice(1).map((pkg) => ({
                id: pkg.id,
                totalSessions: pkg.totalSessions,
                usedSessions: pkg.usedSessions,
                frequency: pkg.frequency,
                status: pkg.status,
                createdAt: pkg.createdAt,
                therapistName: pkg.therapistName,
                program: pkg.program,
              })),
            ]
          : student.packages,
        attendances: student.attendances,
        programChecklist: compactProgramChecklist(programChecklist),
        therapistProfile: therapist
          ? {
              id: therapist.id,
              name: therapist.user?.name || therapistName,
              profileImage: null,
            }
          : projectFlowAssignee
            ? {
                id: projectFlowAssignee.id,
                name: projectFlowAssignee.name,
                profileImage: null,
              }
            : null,
      },
    }, parentPortalCacheHeaders);
  } catch (error) {
    console.error('Error fetching parent portal:', error);
    return prismaErrorResponse(error, 'Gagal memuat parent portal');
  }
}
