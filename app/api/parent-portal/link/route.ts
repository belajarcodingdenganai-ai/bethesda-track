import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createParentPortalSlug, createParentPortalToken } from '@/lib/parent-portal';
import { prismaErrorResponse } from '@/lib/prisma-errors';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId wajib dikirim.' }, { status: 400, headers: noStoreHeaders });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, status: true, parentPhone: true, studentTrack: true },
    });

    if (!student || student.status !== 'ACTIVE' || student.studentTrack !== 'THERAPY' || !student.parentPhone) {
      return NextResponse.json({ error: 'Portal parent tidak tersedia untuk siswa ini.' }, { status: 404, headers: noStoreHeaders });
    }

    const token = createParentPortalToken(student.id);
    const slug = createParentPortalSlug(student.name);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

    return NextResponse.json(
      {
        token,
        slug,
        legacyUrl: `${baseUrl.replace(/\/$/, '')}/parent-portal/${token}`,
        url: `${baseUrl.replace(/\/$/, '')}/parent-portal/${slug}`,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error('Error creating parent portal link:', error);
    return prismaErrorResponse(error, 'Gagal membuat link parent portal');
  }
}
