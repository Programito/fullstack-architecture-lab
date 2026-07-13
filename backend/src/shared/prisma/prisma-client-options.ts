import { PrismaPg } from '@prisma/adapter-pg';
import type { Prisma } from '@prisma/client';

export function createPrismaClientOptions(): Prisma.PrismaClientOptions {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL must be set before Prisma Client is initialized.');
  }

  return {
    adapter: new PrismaPg(connectionString),
  };
}
