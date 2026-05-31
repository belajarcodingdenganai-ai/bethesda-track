import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is missing. Add it to .env for local development, or set it in your hosting environment variables.',
  );
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
