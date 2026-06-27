import { describe, expect, it, vi } from 'vitest';

import { ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { ListRestaurantProductsUseCase } from './list-restaurant-products.use-case';

function makeRepository(): RestaurantMenuAdminRepository {
  return {
    findMenuById: vi.fn(),
    findSectionById: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    reorderSections: vi.fn(),
    findItemById: vi.fn(),
    addSectionItem: vi.fn(),
    updateSectionItem: vi.fn(),
    removeSectionItem: vi.fn(),
    reorderSectionItems: vi.fn(),
    listRestaurantProducts: vi.fn(),
  };
}

describe('ListRestaurantProductsUseCase', () => {
  it('returns the list of products for a restaurant', async () => {
    const repository = makeRepository();
    const products = [
      {
        id: 'rp-1',
        productId: 'p-1',
        name: 'Hamburguesa',
        displayName: null,
        productType: 'simple' as const,
        priceCents: 1200,
        currency: 'EUR',
        isAvailable: true,
        isVisible: true,
      },
    ];
    vi.mocked(repository.listRestaurantProducts).mockResolvedValue(products);
    const useCase = new ListRestaurantProductsUseCase(repository);

    const result = await useCase.execute('r-1');

    expect(result).toEqual(ok(products));
    expect(repository.listRestaurantProducts).toHaveBeenCalledWith('r-1');
  });

  it('returns an empty list when restaurant has no products', async () => {
    const repository = makeRepository();
    vi.mocked(repository.listRestaurantProducts).mockResolvedValue([]);
    const useCase = new ListRestaurantProductsUseCase(repository);

    const result = await useCase.execute('r-empty');

    expect(result).toEqual(ok([]));
  });
});
