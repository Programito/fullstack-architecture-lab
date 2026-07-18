import { describe, expect, it, vi } from 'vitest';

import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import { DeleteFloorElementUseCase } from './delete-floor-element.use-case';

const floors = {
  restaurantId: 'restaurant-1',
  tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 4, isActive: true }],
  floors: [
    {
      id: 'floor-1',
      name: 'Sala principal',
      rows: 10,
      columns: 10,
      elements: [
        {
          id: 'element-1',
          type: 'table' as const,
          label: 'M1',
          x: 0,
          y: 0,
          width: 2,
          height: 2,
          tableId: 'table-1',
          shape: 'square' as const,
          sortOrder: 1,
        },
      ],
    },
  ],
};

describe('DeleteFloorElementUseCase', () => {
  it('deletes an existing element and returns the refreshed floor', async () => {
    const updated = {
      ...floors,
      tables: [],
      floors: [{ ...floors.floors[0]!, elements: [] }],
    };
    const repository = {
      findFloorsByRestaurantId: vi.fn().mockResolvedValue(floors),
      deleteFloorElement: vi.fn().mockResolvedValue(updated),
    } as unknown as RestaurantReadRepository;
    const useCase = new DeleteFloorElementUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      floorId: 'floor-1',
      elementId: 'element-1',
    });

    expect(result).toEqual({ ok: true, value: updated });
    expect(repository.deleteFloorElement).toHaveBeenCalledWith('restaurant-1', 'floor-1', 'element-1');
  });

  it('does not call persistence when the element does not belong to the floor', async () => {
    const repository = {
      findFloorsByRestaurantId: vi.fn().mockResolvedValue(floors),
      deleteFloorElement: vi.fn(),
    } as unknown as RestaurantReadRepository;
    const useCase = new DeleteFloorElementUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      floorId: 'floor-1',
      elementId: 'missing-element',
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'floor_not_found' } });
    expect(repository.deleteFloorElement).not.toHaveBeenCalled();
  });
});
