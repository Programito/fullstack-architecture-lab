import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { seedMesaFlowLayoutDemo } from './mesaflow-layout.seed';

describe('seedMesaFlowLayoutDemo', () => {
  it('creates demo floors, business tables, and floor elements without coupling layout to order state', async () => {
    const organizationFindUnique = vi.fn().mockResolvedValue({ id: 'org-demo' });
    const restaurantFindFirst = vi.fn().mockResolvedValue({ id: 'rest-demo', organizationId: 'org-demo' });
    const restaurantFloorUpsert = vi.fn().mockResolvedValue({ id: 'floor-main' });
    const restaurantTableUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'table-1' })
      .mockResolvedValueOnce({ id: 'table-2' })
      .mockResolvedValueOnce({ id: 'table-3' })
      .mockResolvedValueOnce({ id: 'table-4' })
      .mockResolvedValueOnce({ id: 'stool-1' })
      .mockResolvedValueOnce({ id: 'stool-2' })
      .mockResolvedValueOnce({ id: 'stool-3' });
    const floorElementUpsert = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      organization: { findUnique: organizationFindUnique },
      restaurant: { findFirst: restaurantFindFirst },
      restaurantFloor: { upsert: restaurantFloorUpsert },
      restaurantTable: { upsert: restaurantTableUpsert },
      floorElement: { upsert: floorElementUpsert },
    } as unknown as PrismaClient;

    await seedMesaFlowLayoutDemo(prisma);

    expect(restaurantFloorUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          restaurantId_name: {
            restaurantId: 'rest-demo',
            name: 'Sala principal',
          },
        },
        create: expect.objectContaining({
          rows: 12,
          columns: 16,
        }),
      }),
    );
    expect(restaurantTableUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          restaurantId_tableNumber: {
            restaurantId: 'rest-demo',
            tableNumber: 1,
          },
        },
        create: expect.objectContaining({
          capacity: 2,
          isActive: true,
        }),
      }),
    );
    expect(floorElementUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { floorId_label: { floorId: 'floor-main', label: 'M1' } },
        create: expect.objectContaining({
          type: 'table',
          tableId: 'table-1',
          x: 1,
          y: 1,
          width: 2,
          height: 2,
        }),
      }),
    );
    expect(floorElementUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'bar',
          tableId: null,
          label: 'Bar',
        }),
      }),
    );
  });
});
