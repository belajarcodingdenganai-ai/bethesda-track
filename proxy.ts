import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';

const PUBLIC_PREFIXES = [
  '/parent-portal/',
  '/api/parent-portal/',
  '/_next/',
  '/brand/',
  '/icons/',
];

// Routes yang tidak memerlukan autentikasi admin
const PUBLIC_ROUTES = [
  '/login',
  '/scanner',
  '/teacher-scanner',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/scan',
  '/api/sync',
];

const PUBLIC_GET_ROUTES = [
  '/api/teachers',
];

function isPublicParentPortalPath(pathname: string) {
  return (
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico'
  );
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function isPublicGetRoute(request: NextRequest) {
  if (request.method !== 'GET') return false;

  return PUBLIC_GET_ROUTES.some(
    (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
  );
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check admin authentication for protected routes
  if (!isPublicParentPortalPath(pathname) && !isPublicRoute(pathname) && !isPublicGetRoute(request)) {
    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const isAuthenticated = verifyAdminSessionToken(sessionToken);

    if (!isAuthenticated) {
      // Redirect ke login dengan next parameter
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*).*)', '/api/:path*'],
};
