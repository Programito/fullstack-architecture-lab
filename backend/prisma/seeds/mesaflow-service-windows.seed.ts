import type { PrismaClient } from '@prisma/client';

import { MESAFLOW_DEMO_ORGANIZATION_NAME, MESAFLOW_DEMO_RESTAURANT_NAME } from './mesaflow-demo.seed';

const SERVICE_WINDOWS = [
  { name: 'Comidas', startTime: '12:00', endTime: '16:30', sortOrder: 0 },
  { name: 'Cenas', startTime: '20:00', endTime: '23:30', sortOrder: 1 },
];

export async function seedMesaFlowServiceWindowsDemo(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { name: MESAFLOW_DEMO_ORGANIZATION_NAME },
  });
  if (!organization) {
    throw new Error('MesaFlow demo organization must exist before service windows are seeded.');
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { organizationId: organization.id, name: MESAFLOW_DEMO_RESTAURANT_NAME },
  });
  if (!restaurant) {
    throw new Error('MesaFlow demo restaurant must exist before service windows are seeded.');
  }

  const existing = await prisma.restaurantServiceWindow.count({ where: { restaurantId: restaurant.id } });
  if (existing > 0) return;

  await prisma.restaurantServiceWindow.createMany({
    data: SERVICE_WINDOWS.map((w) => ({
      restaurantId: restaurant.id,
      name: w.name,
      startTime: w.startTime,
      endTime: w.endTime,
      sortOrder: w.sortOrder,
      isActive: true,
    })),
  });
}
