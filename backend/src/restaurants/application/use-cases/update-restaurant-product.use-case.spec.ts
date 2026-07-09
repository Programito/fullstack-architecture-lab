import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { UpdateRestaurantProductUseCase } from './update-restaurant-product.use-case';

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

const UPDATED_DETAIL = {
  id: 'rp-1',
  productId: 'p-1',
  organizationId: 'org-1',
  name: 'Hamburguesa craft premium',
  displayName: null,
  description: null,
  displayDescription: null,
  productType: 'simple' as const,
  course: 'main' as const,
  preparationRoute: 'kitchen' as const,
  preparationRouteOverride: null,
  allergens: ['gluten'] as Array<'gluten'>,
  priceCents: 1490,
  currency: 'EUR',
  isAvailable: true,
  isVisible: true,
  imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger-premium.jpg',
  modifierGroupIds: ['burger-extras'],
};

describe('UpdateRestaurantProductUseCase', () => {
  it('updates and returns the product detail', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateProduct).mockResolvedValue(UPDATED_DETAIL);
    const useCase = new UpdateRestaurantProductUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      productId: 'rp-1',
      name: 'Hamburguesa craft premium',
      priceCents: 1490,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger-premium.jpg',
      modifierGroupIds: ['burger-extras'],
      allergens: ['gluten'],
    });

    expect(result).toEqual(ok(UPDATED_DETAIL));
    expect(repository.updateProduct).toHaveBeenCalledWith(
      'r-1',
      'rp-1',
      expect.objectContaining({
        name: 'Hamburguesa craft premium',
        priceCents: 1490,
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger-premium.jpg',
        modifierGroupIds: ['burger-extras'],
        allergens: ['gluten'],
      }),
    );
  });

  it('returns restaurant_product_not_found when the product does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateProduct).mockResolvedValue(null);
    const useCase = new UpdateRestaurantProductUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', productId: 'missing' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
  });

  it('returns product_name_taken when updated name conflicts', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateProduct).mockRejectedValue(
      new ApplicationErrorException(applicationError('product_name_taken', 'Name taken.')),
    );
    const useCase = new UpdateRestaurantProductUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', productId: 'rp-1', name: 'Existing product' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'product_name_taken' })));
  });
});
