import { NextRequest, NextResponse } from 'next/server';
import { processAttendance, processTeacherAttendance } from '@/app/actions/attendance';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const qrCode = typeof body.qrCode === 'string' ? body.qrCode.trim() : '';
    const teacherId = typeof body.teacherId === 'string' ? body.teacherId : 'teacher-id-placeholder';
    const programId = typeof body.programId === 'string' ? body.programId : undefined;
    const mode = typeof body.mode === 'string' ? body.mode : 'all';

    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: 'QR Code wajib dikirim.' },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const result =
      mode === 'teacher'
        ? await processTeacherAttendance(qrCode)
        : await processAttendance(qrCode, teacherId, programId);

    return NextResponse.json(
      {
        ...result,
        syncedAt: new Date().toISOString(),
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal memproses scan.',
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
