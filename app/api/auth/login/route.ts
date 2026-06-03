import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminPassword,
  getAdminSessionMaxAge,
} from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password : '';

    if (password !== getAdminPassword()) {
      return NextResponse.json({ success: false, error: 'Password admin salah.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: getAdminSessionMaxAge(),
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Gagal login admin.' }, { status: 400 });
  }
}
