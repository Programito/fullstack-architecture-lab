import { describe, expect, it, vi } from 'vitest';

import { PrismaRestaurantMenuAdminRepository } from './prisma-restaurant-menu-admin.repository';

describe('PrismaRestaurantMenuAdminRepository', () => {
  it('includes imageUrl in listed product summaries', async () => {
    const repository = new PrismaRestaurantMenuAdminRepository({
      restaurantProduct: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'rp-1',
            productId: 'p-1',
            displayName: null,
            priceCents: 1290,
            currency: 'EUR',
            isAvailable: true,
            isVisible: true,
            imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
            modifierGroups: [{ modifierGroupId: 'burger-extras' }, { modifierGroupId: 'burger-point' }],
            product: {
              name: 'Hamburguesa craft',
              productType: 'simple',
              defaultCourse: 'main',
              defaultPreparationRoute: 'kitchen',
              allergens: ['gluten', 'milk'],
            },
          },
        ]),
      },
    } as never);

    await expect(repository.listRestaurantProducts('restaurant-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'rp-1',
        name: 'Hamburguesa craft',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
        modifierGroupIds: ['burger-extras', 'burger-point'],
        allergens: ['gluten', 'milk'],
      }),
    ]);
  });

  it('includes imageUrl in product detail', async () => {
    const repository = new PrismaRestaurantMenuAdminRepository({
      restaurantProduct: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'rp-1',
          productId: 'p-1',
          displayName: null,
          displayDescription: null,
          priceCents: 1290,
          currency: 'EUR',
          isAvailable: true,
          isVisible: true,
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
          modifierGroups: [{ modifierGroupId: 'burger-extras' }],
          preparationRouteOverride: null,
          product: {
            organizationId: 'org-1',
            name: 'Hamburguesa craft',
            description: 'Con cheddar',
            productType: 'simple',
            defaultCourse: 'main',
            defaultPreparationRoute: 'kitchen',
            allergens: ['gluten'],
          },
        }),
      },
    } as never);

    await expect(repository.findRestaurantProductById('restaurant-1', 'rp-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'rp-1',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
        modifierGroupIds: ['burger-extras'],
        allergens: ['gluten'],
      }),
    );
  });

  it('defaults allergens to an empty array when the product has none set', async () => {
    const repository = new PrismaRestaurantMenuAdminRepository({
      restaurantProduct: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'rp-2',
          productId: 'p-2',
          displayName: null,
          displayDescription: null,
          priceCents: 990,
          currency: 'EUR',
          isAvailable: true,
          isVisible: true,
          imageUrl: null,
          modifierGroups: [],
          preparationRouteOverride: null,
          product: {
            organizationId: 'org-1',
            name: 'Agua mineral',
            description: null,
            productType: 'simple',
            defaultCourse: 'drinks',
            defaultPreparationRoute: 'bar',
            allergens: [],
          },
        }),
      },
    } as never);

    await expect(repository.findRestaurantProductById('restaurant-1', 'rp-2')).resolves.toEqual(
      expect.objectContaining({ id: 'rp-2', allergens: [] }),
    );
  });
});
