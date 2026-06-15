import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

function ifNoneMatchIncludes(headerValue: string | null, etag: string) {
  if (!headerValue) return false;
  return headerValue
    .split(',')
    .map((value) => value.trim())
    .some((value) => value === etag || value === '*');
}

export function jsonCacheResponse(request: Request, body: unknown, headers: HeadersInit) {
  const payload = JSON.stringify(body);
  const etag = `"sha256-${createHash('sha256').update(payload).digest('base64url')}"`;
  const responseHeaders = {
    ...headers,
    ETag: etag,
  };

  if (ifNoneMatchIncludes(request.headers.get('if-none-match'), etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: responseHeaders,
    });
  }

  return new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...responseHeaders,
    },
  });
}
