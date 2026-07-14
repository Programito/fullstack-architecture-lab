import { PrismaPg } from '@prisma/adapter-pg';
import type { Prisma } from '@prisma/client';

export function createPrismaClientOptions(): Prisma.PrismaClientOptions {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL must be set before Prisma Client is initialized.');
  }

  return {
    adapter: new PrismaPg({
      connectionString,
      // Neon (hosting gratuito) limita muy pocas conexiones simultaneas; el pool por
      // defecto de `pg` (max 10) las agota enseguida en cuanto coinciden el servidor,
      // el polling de readiness y algun script (seed) sobre la misma base. El timeout
      // mas largo da margen al cold start del compute en vez de fallar con "Failed to
      // acquire permit to connect to the database".
      max: 5,
      connectionTimeoutMillis: 10_000,
    }),
  };
}
