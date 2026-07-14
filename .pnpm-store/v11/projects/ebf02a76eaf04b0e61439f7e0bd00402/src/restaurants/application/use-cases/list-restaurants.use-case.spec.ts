import { describe, expect, it, vi } from 'vitest';

import { isOk } from '../../../shared/result/result';
import { ListRestaurantsUseCase } from './list-restaurants.use-case';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

describe('ListRestaurantsUseCase', () => {
  it('passes both restaurant and organization scope to the repository', async () => {
    const listRestaurants = vi.fn().mockResolvedValue([]);
    const repository = { listRestaurants } as unknown as RestaurantReadRepository;
    const useCase = new ListRestaurantsUseCase(repository);

    const result = await useCase.execute(['rest-1'], ['org-1']);

    expect(isOk(result)).toBe(true);
    expect(listRestaurants).toHaveBeenCalledWith(['rest-1'], ['org-1']);
  });
});
