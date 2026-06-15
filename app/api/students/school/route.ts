import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { revalidatePath } from 'next/cache';
import { jsonCacheResponse } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

const listCacheHeaders = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
};

async function getNextSchoolRegistrationNo() {
  const students = await prisma.student.findMany({
    where: { registrationNo: { startsWith: 'SCH-' } },
    select: { registrationNo: true },
  });

  const highestNumber = students.reduce((highest, student) => {
    const match = student.registrationNo.match(/^SCH-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);

  return `SCH-${String(highestNumber + 1).padStart(3, '0')}`;
}

function buildSchoolQrCode(registrationNo: string) {
  return registrationNo;
}

export async function GET(request: NextRequest) {
  try {
    const students = await prisma.student.findMany({
      where: {
        studentTrack: 'SCHOOL',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        registrationNo: true,
        name: true,
        nickname: true,
        gender: true,
        dateOfBirth: true,
        parentPhone: true,
        parentEmail: true,
        address: true,
        diagnosis: true,
        schoolTeacherName: true,
        profileImage: true,
        qrCode: true,
        studentTrack: true,
        createdAt: true,
      },
      orderBy: { registrationNo: 'asc' },
    });

    return jsonCacheResponse(request, { data: students }, listCacheHeaders);
  } catch (error) {
    console.error('Error fetching school students:', error);
    return prismaErrorResponse(error, 'Gagal memuat data siswa sekolah');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Nama siswa wajib diisi.' }, { status: 400, headers: noStoreHeaders });
    }

    const registrationNo = typeof body.registrationNo === 'string' && body.registrationNo.trim()
      ? body.registrationNo.trim()
      : await getNextSchoolRegistrationNo();
    const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;

    const student = await prisma.student.create({
      data: {
        registrationNo,
        name,
        nickname: body.nickname || null,
        gender: body.gender || null,
        dateOfBirth,
        parentPhone: body.parentPhone || null,
        parentEmail: body.parentEmail || null,
        address: body.address || null,
        diagnosis: body.diagnosis || null,
        schoolTeacherName: body.schoolTeacherName || 'ESTER WARUWU',
        profileImage: body.profileImage || null,
        school: 'Rumah Bethesda School',
        qrCode: body.qrCode || buildSchoolQrCode(registrationNo),
        status: 'ACTIVE',
        studentTrack: 'SCHOOL',
      },
    });

    revalidatePath('/students/school');
    revalidatePath('/');
    return NextResponse.json(student, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    console.error('Error creating school student:', error);
    return prismaErrorResponse(error, 'Gagal menyimpan siswa sekolah');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!id) {
      return NextResponse.json({ error: 'ID siswa wajib dikirim.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!name) {
      return NextResponse.json({ error: 'Nama siswa wajib diisi.' }, { status: 400, headers: noStoreHeaders });
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        name,
        nickname: body.nickname || null,
        gender: body.gender || null,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        parentPhone: body.parentPhone || null,
        parentEmail: body.parentEmail || null,
        address: body.address || null,
        diagnosis: body.diagnosis || null,
        schoolTeacherName: body.schoolTeacherName || 'ESTER WARUWU',
        profileImage: body.profileImage || null,
      },
    });

    revalidatePath('/students/school');
    revalidatePath(`/parent-portal/school/${student.name}`);
    return NextResponse.json(student, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error updating school student:', error);
    return prismaErrorResponse(error, 'Gagal memperbarui siswa sekolah');
  }
}
