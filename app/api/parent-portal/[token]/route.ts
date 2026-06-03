import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyParentPortalToken } from '@/lib/parent-portal';
import { prismaErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const payload = verifyParentPortalToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Link parent portal tidak valid.' }, { status: 401, headers: noStoreHeaders });
    }

    const student = await prisma.student.findUnique({
      where: { id: payload.studentId },
      select: {
        id: true,
        registrationNo: true,
        name: true,
        nickname: true,
        age: true,
        profileImage: true,
        status: true,
        packages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            totalSessions: true,
            usedSessions: true,
            frequency: true,
            status: true,
            createdAt: true,
            program: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attendances: {
          take: 12,
          orderBy: { checkIn: 'desc' },
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            status: true,
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
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendances: true,
            packages: true,
          },
        },
      },
    });

    if (!student || student.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Data portal parent tidak ditemukan.' }, { status: 404, headers: noStoreHeaders });
    }

    const response = NextResponse.json({ student, syncedAt: new Date().toISOString() }, { headers: noStoreHeaders });
    response.cookies.set('bethesda_parent_portal', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Error fetching parent portal:', error);
    return prismaErrorResponse(error, 'Gagal memuat parent portal');
  }
}
