import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../src/shared/prisma/prisma-client-options';

import { seedMesaFlowDemo } from './seeds/mesaflow-demo.seed';
import { seedMesaFlowLayoutDemo } from './seeds/mesaflow-layout.seed';
import { seedMesaFlowOrdersDemo } from './seeds/mesaflow-orders.seed';
import { seedMesaFlowReservationsDemo } from './seeds/mesaflow-reservations.seed';
import { seedMesaFlowServiceWindowsDemo } from './seeds/mesaflow-service-windows.seed';
import { seedPermissions } from './seeds/permissions.seed';
import { seedRoles } from './seeds/roles.seed';
import { seedDemoUsers } from './seeds/demo-users.seed';

const prisma = new PrismaClient(createPrismaClientOptions());

async function main(): Promise<void> {
  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedMesaFlowDemo(prisma);
  await seedDemoUsers(prisma);
  await seedMesaFlowLayoutDemo(prisma);
  await seedMesaFlowOrdersDemo(prisma);
  await seedMesaFlowReservationsDemo(prisma);
  await seedMesaFlowServiceWindowsDemo(prisma);
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
