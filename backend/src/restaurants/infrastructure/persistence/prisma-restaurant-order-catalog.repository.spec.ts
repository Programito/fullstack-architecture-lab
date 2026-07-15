import { describe, expect, it, vi } from 'vitest';

import { PrismaRestaurantOrderCatalogRepository } from './prisma-restaurant-order-catalog.repository';

describe('PrismaRestaurantOrderCatalogRepository', () => {
  it('backfills demo menu translations when Prisma rows have null i18n fields', async () => {
    const repository = new PrismaRestaurantOrderCatalogRepository({
      restaurantMenu: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'menu-main',
          restaurantId: 'restaurant-mesaflow-centro',
          name: 'Carta principal',
          isActive: true,
          sections: [
            {
              id: 'section-drinks',
              name: 'Bebidas',
              nameI18n: null,
              sortOrder: 1,
              isVisible: true,
              items: [
                {
                  id: 'menu-item-coke',
                  displayNameOverride: null,
                  priceOverrideCents: null,
                  isVisible: true,
                  restaurantProduct: {
                    id: 'rp-coke',
                    displayName: null,
                    imageUrl: null,
                    priceCents: 320,
                    currency: 'EUR',
                    isAvailable: true,
                    product: {
                      id: 'product-coke',
                      name: 'Coca-Cola',
                      nameI18n: null,
                      description: null,
                      descriptionI18n: null,
                      productType: 'simple',
                      defaultCourse: 'drinks',
                      defaultPreparationRoute: 'bar',
                      allergens: [],
                      comboDefinition: null,
                      platterDefinition: null,
                    },
                    modifierGroups: [
                      {
                        modifierGroup: {
                          id: 'group-drink-size',
                          name: 'Tamaño de bebida',
                          nameI18n: null,
                          selectionType: 'single',
                          minSelections: 1,
                          maxSelections: 1,
                          isRequired: true,
                          options: [
                            {
                              id: 'option-medium',
                              name: 'Mediana',
                              nameI18n: null,
                              priceDeltaCents: 0,
                              isAvailable: true,
                            },
                            {
                              id: 'option-xl',
                              name: 'XL',
                              nameI18n: null,
                              priceDeltaCents: 100,
                              isAvailable: true,
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      },
    } as never);

    const menu = await repository.findActiveMenu('restaurant-mesaflow-centro');

    expect(menu?.sections[0]?.nameI18n).toEqual({
      es: 'Bebidas',
      ca: 'Begudes',
      en: 'Drinks',
    });
    expect(menu?.sections[0]?.items[0]?.nameI18n).toEqual({
      es: 'Coca-Cola',
      ca: 'Coca-Cola',
      en: 'Coke',
    });
    expect(menu?.sections[0]?.items[0]?.modifierGroups).toEqual([
      expect.objectContaining({
        nameI18n: {
          es: 'Tamaño de bebida',
          ca: 'Mida de beguda',
          en: 'Drink size',
        },
        options: [
          expect.objectContaining({
            nameI18n: {
              es: 'Mediana',
              ca: 'Mitjana',
              en: 'Medium',
            },
          }),
          expect.objectContaining({ id: 'option-xl', priceDeltaCents: 100 }),
        ],
      }),
    ]);
  });

  it('applies a per-product modifier option price override instead of the default price', async () => {
    const repository = new PrismaRestaurantOrderCatalogRepository({
      restaurantMenu: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'menu-main',
          restaurantId: 'restaurant-mesaflow-centro',
          name: 'Carta principal',
          isActive: true,
          sections: [
            {
              id: 'section-drinks',
              name: 'Bebidas',
              nameI18n: null,
              sortOrder: 1,
              isVisible: true,
              items: [
                {
                  id: 'menu-item-coke',
                  displayNameOverride: null,
                  priceOverrideCents: null,
                  isVisible: true,
                  restaurantProduct: {
                    id: 'rp-coke',
                    displayName: null,
                    imageUrl: null,
                    priceCents: 320,
                    currency: 'EUR',
                    isAvailable: true,
                    product: {
                      id: 'product-coke',
                      name: 'Coca-Cola',
                      nameI18n: null,
                      description: null,
                      descriptionI18n: null,
                      productType: 'simple',
                      defaultCourse: 'drinks',
                      defaultPreparationRoute: 'bar',
                      allergens: [],
                      comboDefinition: null,
                      platterDefinition: null,
                    },
                    modifierGroups: [
                      {
                        modifierGroup: {
                          id: 'group-drink-size',
                          name: 'Tamaño de bebida',
                          nameI18n: null,
                          selectionType: 'single',
                          minSelections: 1,
                          maxSelections: 1,
                          isRequired: true,
                          options: [
                            { id: 'option-xl', name: 'XL', nameI18n: null, priceDeltaCents: 100, isAvailable: true },
                          ],
                        },
                      },
                    ],
                    modifierOptionOverrides: [{ modifierOptionId: 'option-xl', priceDeltaCents: 150 }],
                  },
                },
              ],
            },
          ],
        }),
      },
    } as never);

    const menu = await repository.findActiveMenu('restaurant-mesaflow-centro');

    expect(menu?.sections[0]?.items[0]?.modifierGroups[0]?.options[0]).toEqual(
      expect.objectContaining({ id: 'option-xl', priceDeltaCents: 150 }),
    );
  });

  it('exposes the tax rate name and percent assigned to the product, or null when it has none', async () => {
    const baseItem = {
      id: 'menu-item-x',
      displayNameOverride: null,
      priceOverrideCents: null,
      isVisible: true,
      restaurantProduct: {
        id: 'rp-x',
        displayName: null,
        imageUrl: null,
        priceCents: 320,
        currency: 'EUR',
        isAvailable: true,
        modifierGroups: [],
        modifierOptionOverrides: [],
      },
    };
    const repository = new PrismaRestaurantOrderCatalogRepository({
      restaurantMenu: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'menu-main',
          restaurantId: 'restaurant-mesaflow-centro',
          name: 'Carta principal',
          isActive: true,
          sections: [
            {
              id: 'section-drinks',
              name: 'Bebidas',
              nameI18n: null,
              sortOrder: 1,
              isVisible: true,
              items: [
                {
                  ...baseItem,
                  id: 'menu-item-with-tax',
                  restaurantProduct: {
                    ...baseItem.restaurantProduct,
                    id: 'rp-with-tax',
                    product: {
                      id: 'product-with-tax',
                      name: 'Coca-Cola',
                      nameI18n: null,
                      description: null,
                      descriptionI18n: null,
                      productType: 'simple',
                      defaultCourse: 'drinks',
                      defaultPreparationRoute: 'bar',
                      allergens: [],
                      taxRate: { name: 'IVA General', ratePercent: { toString: () => '21' } },
                      comboDefinition: null,
                      platterDefinition: null,
                    },
                  },
                },
                {
                  ...baseItem,
                  id: 'menu-item-without-tax',
                  restaurantProduct: {
                    ...baseItem.restaurantProduct,
                    id: 'rp-without-tax',
                    product: {
                      id: 'product-without-tax',
                      name: 'Agua',
                      nameI18n: null,
                      description: null,
                      descriptionI18n: null,
                      productType: 'simple',
                      defaultCourse: 'drinks',
                      defaultPreparationRoute: 'bar',
                      allergens: [],
                      taxRate: null,
                      comboDefinition: null,
                      platterDefinition: null,
                    },
                  },
                },
              ],
            },
          ],
        }),
      },
    } as never);

    const menu = await repository.findActiveMenu('restaurant-mesaflow-centro');

    expect(menu?.sections[0]?.items[0]).toEqual(expect.objectContaining({ taxRateName: 'IVA General', taxRatePercent: 21 }));
    expect(menu?.sections[0]?.items[1]).toEqual(expect.objectContaining({ taxRateName: null, taxRatePercent: null }));
  });
});
