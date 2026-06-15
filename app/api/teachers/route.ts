import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonCacheResponse } from '@/lib/api-cache';

const listCacheHeaders = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
};

export async function GET(request: NextRequest) {
  try {
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        teacherId: true,
        division: true,
        position: true,
        phone: true,
        qrCode: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: { userId: 'asc' },
    });

    return jsonCacheResponse(request, {
      data: teachers.map((t) => ({
        ...t,
        name: t.user?.name,
      })),
      total: teachers.length,
    }, listCacheHeaders);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const teacher = await prisma.teacher.create({
      data: {
        teacherId: body.teacherId,
        division: body.division,
        position: body.position,
        phone: body.phone,
        qrCode: body.qrCode || body.teacherId,
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
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}
