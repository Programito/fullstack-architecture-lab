import { PrismaClient } from '@prisma/client';

import { seedPermissions } from './seeds/permissions.seed';
import { seedRoles } from './seeds/roles.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedPermissions(prisma);
  await seedRoles(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
