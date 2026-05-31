import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function getNextStudentRegistrationNo() {
  const students = await prisma.student.findMany({
    where: { registrationNo: { startsWith: 'BETH-' } },
    select: { registrationNo: true },
  });

  const highestNumber = students.reduce((highest, student) => {
    const match = student.registrationNo.match(/^BETH-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);

  return `BETH-${String(highestNumber + 1).padStart(3, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          _count: {
            select: {
              attendances: true,
              packages: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      data: students,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const registrationNo = body.registrationNo || await getNextStudentRegistrationNo();
    const qrCode = body.qrCode || `STU-${registrationNo}`;

    const student = await prisma.student.create({
      data: {
        registrationNo,
        name: body.name,
        nickname: body.nickname,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        age: body.age,
        address: body.address,
        parentPhone: body.parentPhone,
        parentEmail: null,
        school: body.school,
        diagnosis: body.diagnosis,
        qrCode,
        status: body.status || 'ACTIVE',
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error: any) {
    console.error('Error creating student:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Registration number or QR code already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
