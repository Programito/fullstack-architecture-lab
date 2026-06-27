import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { DeleteRestaurantProductUseCase } from './delete-restaurant-product.use-case';

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
    findRestaurantProductById: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  };
}

describe('DeleteRestaurantProductUseCase', () => {
  it('returns ok when the product is deleted', async () => {
    const repository = makeRepository();
    vi.mocked(repository.deleteProduct).mockResolvedValue(true);
    const useCase = new DeleteRestaurantProductUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', productId: 'rp-1' });

    expect(result).toEqual(ok(undefined));
    expect(repository.deleteProduct).toHaveBeenCalledWith('r-1', 'rp-1');
  });

  it('returns restaurant_product_not_found when the product does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.deleteProduct).mockResolvedValue(false);
    const useCase = new DeleteRestaurantProductUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', productId: 'missing' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
  });
});
