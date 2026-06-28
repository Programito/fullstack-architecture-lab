import { describe, expect, it, vi } from 'vitest';

import { restaurantNotFound } from '../../../shared/errors/application-error';
import type { RestaurantServiceWindowsRepository } from '../ports/restaurant-service-windows-repository.port';
import { GetRestaurantServiceWindowsUseCase } from './get-restaurant-service-windows.use-case';

function makeRepository(): RestaurantServiceWindowsRepository {
  return {
    findServiceWindowsByRestaurantId: vi.fn(),
    updateServiceWindows: vi.fn(),
  };
}

function makeWindows() {
  return [
    { id: 'sw-1', restaurantId: 'r-1', name: 'Comidas', startTime: '12:00', endTime: '16:30', sortOrder: 1 },
    { id: 'sw-2', restaurantId: 'r-1', name: 'Cenas', startTime: '20:00', endTime: '23:30', sortOrder: 2 },
  ];
}

describe('GetRestaurantServiceWindowsUseCase', () => {
  it('returns the service windows for an existing restaurant', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findServiceWindowsByRestaurantId).mockResolvedValue(makeWindows());
    const useCase = new GetRestaurantServiceWindowsUseCase(repository);

    const result = await useCase.execute('r-1');

    expect(result).toEqual({ ok: true, value: makeWindows() });
    expect(repository.findServiceWindowsByRestaurantId).toHaveBeenCalledWith('r-1');
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findServiceWindowsByRestaurantId).mockResolvedValue(null);
    const useCase = new GetRestaurantServiceWindowsUseCase(repository);

    const result = await useCase.execute('missing');

    expect(result).toEqual({ ok: false, error: restaurantNotFound('missing') });
  });
});
