import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_SESSION_COOKIE = 'bethesda_admin_session';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret() {
  return (
    process.env.ADMIN_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.PARENT_PORTAL_SECRET ||
    'bethesda-admin-session-v1'
  );
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'AdminBethesda2026!';
}

function sign(value: string) {
  return createHmac('sha256', getAuthSecret()).update(value).digest('base64url');
}

export function createAdminSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token?: string | null) {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [role, expiresAtText, signature] = parts;
  if (role !== 'admin') return false;

  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${role}.${expiresAtText}`;
  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  return (
    signatureBuffer.length === expectedBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedBuffer)
  );
}

export function getAdminSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}

export function isAdminAuthenticated(sessionToken?: string | null) {
  return verifyAdminSessionToken(sessionToken);
}
