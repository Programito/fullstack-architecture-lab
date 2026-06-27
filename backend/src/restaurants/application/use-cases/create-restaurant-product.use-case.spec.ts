import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { CreateRestaurantProductUseCase } from './create-restaurant-product.use-case';

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

const PRODUCT_DETAIL = {
  id: 'rp-1',
  productId: 'p-1',
  organizationId: 'org-1',
  name: 'Hamburguesa craft',
  displayName: null,
  description: 'Con cheddar y bacon',
  displayDescription: null,
  productType: 'simple' as const,
  course: 'main' as const,
  preparationRoute: 'kitchen' as const,
  preparationRouteOverride: null,
  priceCents: 1290,
  currency: 'EUR',
  isAvailable: true,
  isVisible: true,
};

describe('CreateRestaurantProductUseCase', () => {
  it('creates and returns the product detail', async () => {
    const repository = makeRepository();
    vi.mocked(repository.createProduct).mockResolvedValue(PRODUCT_DETAIL);
    const useCase = new CreateRestaurantProductUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      name: 'Hamburguesa craft',
      description: 'Con cheddar y bacon',
      course: 'main',
      preparationRoute: 'kitchen',
      priceCents: 1290,
      currency: 'EUR',
    });

    expect(result).toEqual(ok(PRODUCT_DETAIL));
    expect(repository.createProduct).toHaveBeenCalledWith('r-1', {
      name: 'Hamburguesa craft',
      description: 'Con cheddar y bacon',
      course: 'main',
      preparationRoute: 'kitchen',
      priceCents: 1290,
      currency: 'EUR',
    });
  });

  it('returns product_name_taken when the name already exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.createProduct).mockRejectedValue(
      new ApplicationErrorException(applicationError('product_name_taken', 'Name taken.')),
    );
    const useCase = new CreateRestaurantProductUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      name: 'Hamburguesa craft',
      course: 'main',
      preparationRoute: 'kitchen',
      priceCents: 1290,
      currency: 'EUR',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'product_name_taken' })));
  });

  it('rethrows unexpected errors', async () => {
    const repository = makeRepository();
    vi.mocked(repository.createProduct).mockRejectedValue(new Error('DB connection lost'));
    const useCase = new CreateRestaurantProductUseCase(repository);

    await expect(
      useCase.execute({ restaurantId: 'r-1', name: 'X', course: 'main', preparationRoute: 'kitchen', priceCents: 100, currency: 'EUR' }),
    ).rejects.toThrow('DB connection lost');
  });
});
