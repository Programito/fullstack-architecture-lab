import type { PrismaClient } from '@prisma/client';

import { MESAFLOW_DEMO_ORGANIZATION_NAME, MESAFLOW_DEMO_RESTAURANT_NAME } from './mesaflow-demo.seed';

const RESERVATION_LUNCH_ID = 'reservation-demo-lunch';
const RESERVATION_GROUP_ID = 'reservation-demo-group';

export async function seedMesaFlowReservationsDemo(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { name: MESAFLOW_DEMO_ORGANIZATION_NAME },
  });
  if (!organization) {
    throw new Error('MesaFlow demo organization must exist before reservations are seeded.');
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      organizationId: organization.id,
      name: MESAFLOW_DEMO_RESTAURANT_NAME,
    },
  });
  if (!restaurant) {
    throw new Error('MesaFlow demo restaurant must exist before reservations are seeded.');
  }

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: restaurant.id },
  });
  const tableIdByNumber = new Map(tables.map((table) => [table.tableNumber, table.id]));

  const laura = await prisma.customer.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Laura Gomez',
      },
    },
    update: {
      phone: '+34 600 111 222',
      email: 'laura.gomez@example.com',
      notes: 'Prefiere terraza si hay disponibilidad.',
    },
    create: {
      organizationId: organization.id,
      name: 'Laura Gomez',
      phone: '+34 600 111 222',
      email: 'laura.gomez@example.com',
      notes: 'Prefiere terraza si hay disponibilidad.',
    },
  });

  const diego = await prisma.customer.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Diego Martin',
      },
    },
    update: {
      phone: '+34 600 333 444',
      email: 'diego.martin@example.com',
      notes: 'Reserva habitual para grupos.',
    },
    create: {
      organizationId: organization.id,
      name: 'Diego Martin',
      phone: '+34 600 333 444',
      email: 'diego.martin@example.com',
      notes: 'Reserva habitual para grupos.',
    },
  });

  const lunchReservation = await prisma.reservation.upsert({
    where: { id: RESERVATION_LUNCH_ID },
    update: {
      restaurantId: restaurant.id,
      customerId: laura.id,
      customerNameSnapshot: laura.name,
      customerPhoneSnapshot: laura.phone,
      partySize: 2,
      reservationAt: new Date('2026-06-21T13:30:00.000Z'),
      durationMinutes: 90,
      status: 'confirmed',
      notes: 'Mesa tranquila.',
    },
    create: {
      id: RESERVATION_LUNCH_ID,
      restaurantId: restaurant.id,
      customerId: laura.id,
      customerNameSnapshot: laura.name,
      customerPhoneSnapshot: laura.phone,
      partySize: 2,
      reservationAt: new Date('2026-06-21T13:30:00.000Z'),
      durationMinutes: 90,
      status: 'confirmed',
      notes: 'Mesa tranquila.',
    },
  });

  const groupReservation = await prisma.reservation.upsert({
    where: { id: RESERVATION_GROUP_ID },
    update: {
      restaurantId: restaurant.id,
      customerId: diego.id,
      customerNameSnapshot: diego.name,
      customerPhoneSnapshot: diego.phone,
      partySize: 8,
      reservationAt: new Date('2026-06-21T21:00:00.000Z'),
      durationMinutes: 120,
      status: 'pending',
      notes: 'Grupo de cena de empresa.',
    },
    create: {
      id: RESERVATION_GROUP_ID,
      restaurantId: restaurant.id,
      customerId: diego.id,
      customerNameSnapshot: diego.name,
      customerPhoneSnapshot: diego.phone,
      partySize: 8,
      reservationAt: new Date('2026-06-21T21:00:00.000Z'),
      durationMinutes: 120,
      status: 'pending',
      notes: 'Grupo de cena de empresa.',
    },
  });

  await prisma.reservationTable.deleteMany({ where: { reservationId: lunchReservation.id } });
  await prisma.reservationTable.createMany({
    data: [
      {
        reservationId: lunchReservation.id,
        tableId: requiredTableId(tableIdByNumber, 1),
      },
    ],
  });

  await prisma.reservationTable.deleteMany({ where: { reservationId: groupReservation.id } });
  await prisma.reservationTable.createMany({
    data: [
      {
        reservationId: groupReservation.id,
        tableId: requiredTableId(tableIdByNumber, 3),
      },
      {
        reservationId: groupReservation.id,
        tableId: requiredTableId(tableIdByNumber, 4),
      },
    ],
  });
}

function requiredTableId(tableIdByNumber: Map<number, string>, tableNumber: number): string {
  const tableId = tableIdByNumber.get(tableNumber);
  if (!tableId) {
    throw new Error(`Missing restaurant table ${tableNumber} for reservation seed.`);
  }
  return tableId;
}
