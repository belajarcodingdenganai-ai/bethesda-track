import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is missing. Add it to .env for local development, or set it in your hosting environment variables.',
  );
}

function normalizeDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);

    if (url.hostname.includes('pooler.supabase.com')) {
      if (url.port === '5432') {
        url.port = '6543';
      }

      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }

      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '1');
      }

      if (!url.searchParams.has('pool_timeout')) {
        url.searchParams.set('pool_timeout', '20');
      }
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
