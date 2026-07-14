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
        ],
      }),
    ]);
  });
});
