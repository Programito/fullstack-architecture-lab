import { describe, expect, it, vi } from 'vitest';

import { PrismaRestaurantMenuAdminRepository } from './prisma-restaurant-menu-admin.repository';

describe('PrismaRestaurantMenuAdminRepository', () => {
  it('moves menu items through temporary sort orders before applying their final order', async () => {
    const menuItemUpdateMany = vi.fn((operation) => operation);
    const transaction = vi.fn(async (operations: unknown[]) => operations);
    const repository = new PrismaRestaurantMenuAdminRepository({
      menuSection: {
        findFirst: vi.fn().mockResolvedValue({ id: 'section-1' }),
      },
      menuItem: {
        updateMany: menuItemUpdateMany,
      },
      $transaction: transaction,
    } as never);

    await expect(
      repository.reorderSectionItems('restaurant-1', 'menu-1', 'section-1', [
        { id: 'item-a', sortOrder: 20 },
        { id: 'item-b', sortOrder: 10 },
      ]),
    ).resolves.toBe(true);

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(menuItemUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'item-a', menuSectionId: 'section-1' },
      data: { sortOrder: 1000020 },
    });
    expect(menuItemUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'item-b', menuSectionId: 'section-1' },
      data: { sortOrder: 1000010 },
    });
    expect(menuItemUpdateMany).toHaveBeenNthCalledWith(3, {
      where: { id: 'item-a', menuSectionId: 'section-1' },
      data: { sortOrder: 20 },
    });
    expect(menuItemUpdateMany).toHaveBeenNthCalledWith(4, {
      where: { id: 'item-b', menuSectionId: 'section-1' },
      data: { sortOrder: 10 },
    });
  });

  it('moves menu sections through temporary sort orders before applying their final order', async () => {
    const menuSectionUpdateMany = vi.fn((operation) => operation);
    const transaction = vi.fn(async (operations: unknown[]) => operations);
    const repository = new PrismaRestaurantMenuAdminRepository({
      restaurantMenu: {
        findFirst: vi.fn().mockResolvedValue({ id: 'menu-1' }),
      },
      menuSection: {
        updateMany: menuSectionUpdateMany,
      },
      $transaction: transaction,
    } as never);

    await expect(
      repository.reorderSections('restaurant-1', 'menu-1', [
        { id: 'section-a', sortOrder: 20 },
        { id: 'section-b', sortOrder: 10 },
      ]),
    ).resolves.toBe(true);

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(menuSectionUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'section-a', menuId: 'menu-1' },
      data: { sortOrder: 1000020 },
    });
    expect(menuSectionUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'section-b', menuId: 'menu-1' },
      data: { sortOrder: 1000010 },
    });
    expect(menuSectionUpdateMany).toHaveBeenNthCalledWith(3, {
      where: { id: 'section-a', menuId: 'menu-1' },
      data: { sortOrder: 20 },
    });
    expect(menuSectionUpdateMany).toHaveBeenNthCalledWith(4, {
      where: { id: 'section-b', menuId: 'menu-1' },
      data: { sortOrder: 10 },
    });
  });

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
