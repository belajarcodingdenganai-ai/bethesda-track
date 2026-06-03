import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isParentPortal = searchParams.get('portal') === 'parent';

    const student = await prisma.student.findUnique({
      where: { id: id },
      select: {
        id: true,
        registrationNo: true,
        name: true,
        nickname: true,
        gender: true,
        age: true,
        profileImage: true,
        address: !isParentPortal,
        parentPhone: !isParentPortal,
        parentEmail: !isParentPortal,
        school: !isParentPortal,
        diagnosis: !isParentPortal,
        qrCode: !isParentPortal,
        status: true,
        packages: {
          orderBy: { createdAt: 'desc' },
          take: isParentPortal ? 1 : 5,
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
        programs: isParentPortal ? false : {
          select: {
            id: true,
            program: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attendances: {
          take: isParentPortal ? 8 : 10,
          orderBy: { checkIn: 'desc' },
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
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

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(student, {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    return prismaErrorResponse(error, 'Failed to fetch student');
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const student = await prisma.student.update({
      where: { id },
      data: {
        name: body.name,
        nickname: body.nickname,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        age: body.age,
        address: body.address,
        parentPhone: body.parentPhone,
        parentEmail: body.parentEmail,
        school: body.school,
        diagnosis: body.diagnosis,
        profileImage: body.profileImage,
        status: body.status,
      },
    });

    revalidatePath('/');
    revalidatePath('/students');
    revalidatePath('/sessions');
    revalidatePath(`/students/${id}`);

    return NextResponse.json(student, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.student.delete({
      where: { id },
    });

    revalidatePath('/');
    revalidatePath('/students');
    revalidatePath('/sessions');

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
