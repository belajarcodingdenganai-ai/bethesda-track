import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

type ParentPortalPayload = {
  studentId: string;
  version: 1;
};

function getPortalSecret() {
  return (
    process.env.PARENT_PORTAL_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.DATABASE_URL ||
    'bethesda-parent-portal-development-secret'
  );
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function signPayload(payload: string) {
  return toBase64Url(createHmac('sha256', getPortalSecret()).update(payload).digest());
}

export function createParentPortalToken(studentId: string) {
  const payload = toBase64Url(JSON.stringify({ studentId, version: 1 } satisfies ParentPortalPayload));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function createParentPortalSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'anak';
}

export function verifyParentPortalToken(token: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as ParentPortalPayload;
    if (!parsed.studentId || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}
