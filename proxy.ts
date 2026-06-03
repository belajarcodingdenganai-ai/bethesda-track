import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PREFIXES = [
  '/parent-portal/',
  '/api/parent-portal/',
  '/_next/',
  '/brand/',
  '/icons/',
];

function isPublicParentPortalPath(pathname: string) {
  return (
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico'
  );
}

export function proxy(request: NextRequest) {
  const parentPortalToken = request.cookies.get('bethesda_parent_portal')?.value;

  if (!parentPortalToken || isPublicParentPortalPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Sesi parent hanya bisa mengakses Parent Portal.' },
      { status: 403 },
    );
  }

  const portalUrl = request.nextUrl.clone();
  portalUrl.pathname = `/parent-portal/${parentPortalToken}`;
  portalUrl.search = '';
  return NextResponse.redirect(portalUrl);
}

export const config = {
  matcher: ['/((?!.*\\..*).*)', '/api/:path*'],
};
