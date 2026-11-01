import { PrismaClient } from '@prisma/client';
import { HttpError } from './http.ts';

let prisma: PrismaClient | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrisma(): PrismaClient {
  if (!isDatabaseConfigured()) {
    throw new HttpError(503, 'DATABASE_UNCONFIGURED', 'The database is not configured.');
  }
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function disconnectDatabase(): Promise<void> {
  if (!prisma) return;
  await prisma.$disconnect();
  prisma = null;
}
