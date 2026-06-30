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
          },
        }),
      },
    } as never);

    await expect(repository.findRestaurantProductById('restaurant-1', 'rp-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'rp-1',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
        modifierGroupIds: ['burger-extras'],
      }),
    );
  });
});
