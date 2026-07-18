import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrismaRestaurantReadRepository } from './prisma-restaurant-read.repository';

describe('PrismaRestaurantReadRepository', () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.restoreAllMocks();
  });

  it('loads the active menu from Prisma when a database URL is configured', async () => {
    process.env.DATABASE_URL = 'postgresql://demo';

    const repository = new PrismaRestaurantReadRepository({
      restaurantMenu: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'menu-main',
          restaurantId: 'restaurant-mesaflow-centro',
          name: 'Carta principal',
          isActive: true,
          sections: [
            {
              id: 'section-burgers',
              name: 'Hamburguesas',
              nameI18n: { es: 'Hamburguesas', ca: 'Hamburgueses', en: 'Burgers' },
              sortOrder: 3,
              isVisible: true,
              items: [
                {
                  id: 'menu-item-burger',
                  displayNameOverride: null,
                  priceOverrideCents: null,
                  isVisible: true,
                  restaurantProduct: {
                    id: 'rp-burger',
                    displayName: null,
                    priceCents: 1250,
                    currency: 'EUR',
                    isAvailable: true,
                    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
                    modifierOptionOverrides: [
                      {
                        modifierOptionId: 'option-medium',
                        priceDeltaCents: 120,
                      },
                    ],
                    product: {
                      id: 'product-burger',
                      name: 'Hamburguesa craft',
                      nameI18n: { es: 'Hamburguesa craft', ca: 'Hamburguesa craft', en: 'Craft burger' },
                      description: 'Carne madurada',
                      descriptionI18n: { es: 'Carne madurada', ca: 'Carn madurada', en: 'Aged beef' },
                      productType: 'simple',
                      defaultCourse: 'main',
                      defaultPreparationRoute: 'kitchen',
                      taxRate: {
                        name: 'IVA General',
                        ratePercent: { toString: () => '21' },
                      },
                      comboDefinition: null,
                      platterDefinition: null,
                    },
                    modifierGroups: [
                      {
                        modifierGroup: {
                          id: 'group-burger-point',
                          name: 'Punto de la carne',
                          nameI18n: { es: 'Punto de la carne', ca: 'Punt de la carn', en: 'Burger point' },
                          selectionType: 'single',
                          minSelections: 1,
                          maxSelections: 1,
                          isRequired: true,
                          options: [
                            {
                              id: 'option-medium',
                              name: 'Al punto',
                              nameI18n: { es: 'Al punto', ca: 'Al punt', en: 'Medium' },
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
            {
              id: 'section-menus',
              name: 'Menus',
              sortOrder: 8,
              isVisible: true,
              items: [
                {
                  id: 'menu-item-combo',
                  displayNameOverride: null,
                  priceOverrideCents: null,
                  isVisible: true,
                  restaurantProduct: {
                    id: 'rp-combo',
                    displayName: null,
                    priceCents: 1390,
                    currency: 'EUR',
                    isAvailable: true,
                    imageUrl: null,
                    modifierOptionOverrides: [],
                    product: {
                      id: 'product-combo',
                      name: 'Menu Classic Burger',
                      nameI18n: { es: 'Menu Classic Burger', ca: 'Menu Classic Burger', en: 'Classic Burger Menu' },
                      description: null,
                      descriptionI18n: null,
                      productType: 'combo',
                      defaultCourse: 'main',
                      defaultPreparationRoute: 'kitchen',
                      comboDefinition: {
                        id: 'combo-1',
                        slots: [],
                      },
                      platterDefinition: null,
                    },
                    modifierGroups: [],
                  },
                },
              ],
            },
          ],
        }),
      },
    } as never);

    const menu = await repository.findMenuByRestaurantId('restaurant-mesaflow-centro');

    expect(menu).toMatchObject({
      id: 'menu-main',
      restaurantId: 'restaurant-mesaflow-centro',
      name: 'Carta principal',
      isActive: true,
    });
    expect(menu?.sections.map((section) => section.name)).toEqual(['Hamburguesas', 'Menus']);
    expect(menu?.sections[0]?.nameI18n).toEqual({
      es: 'Hamburguesas',
      ca: 'Hamburgueses',
      en: 'Burgers',
    });
    expect(menu?.sections[0]?.items[0]).toMatchObject({
      restaurantProductId: 'rp-burger',
      productId: 'product-burger',
      name: 'Hamburguesa craft',
      nameI18n: { es: 'Hamburguesa craft', ca: 'Hamburguesa craft', en: 'Craft burger' },
      descriptionI18n: { es: 'Carne madurada', ca: 'Carn madurada', en: 'Aged beef' },
      productType: 'simple',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
      taxRateName: 'IVA General',
      taxRatePercent: 21,
    });
    expect(menu?.sections[0]?.items[0]?.modifierGroups).toEqual([
      expect.objectContaining({
        name: 'Punto de la carne',
        nameI18n: { es: 'Punto de la carne', ca: 'Punt de la carn', en: 'Burger point' },
        options: [
          expect.objectContaining({
            name: 'Al punto',
            nameI18n: { es: 'Al punto', ca: 'Al punt', en: 'Medium' },
            priceDeltaCents: 120,
          }),
        ],
      }),
    ]);
    expect(menu?.sections[1]?.items[0]).toMatchObject({
      name: 'Menu Classic Burger',
      nameI18n: { es: 'Menu Classic Burger', ca: 'Menu Classic Burger', en: 'Classic Burger Menu' },
      productType: 'combo',
      imageUrl: null,
      comboDefinition: { id: 'combo-1', slots: [] },
    });
  });

  it('backfills demo menu translations when the active Prisma data has no i18n payloads', async () => {
    process.env.DATABASE_URL = 'postgresql://demo';

    const repository = new PrismaRestaurantReadRepository({
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
                    priceCents: 320,
                    currency: 'EUR',
                    isAvailable: true,
                    imageUrl: null,
                    modifierOptionOverrides: [],
                    product: {
                      id: 'product-coke',
                      name: 'Coca-Cola',
                      nameI18n: null,
                      description: null,
                      descriptionI18n: null,
                      productType: 'simple',
                      defaultCourse: 'drinks',
                      defaultPreparationRoute: 'bar',
                      taxRate: null,
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

    const menu = await repository.findMenuByRestaurantId('restaurant-mesaflow-centro');

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

  it('loads floors and tables from Prisma when a database URL is configured', async () => {
    process.env.DATABASE_URL = 'postgresql://demo';

    const repository = new PrismaRestaurantReadRepository({
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({ id: 'restaurant-mesaflow-centro' }),
      },
      restaurantFloor: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'floor-main',
            restaurantId: 'restaurant-mesaflow-centro',
            name: 'Sala principal',
            rows: 12,
            columns: 16,
            elements: [
              {
                id: 'floor-element-1',
                type: 'table',
                label: 'M1',
                x: 1,
                y: 1,
                width: 2,
                height: 2,
                tableId: 'table-1',
                shape: 'square',
                sortOrder: 1,
              },
              {
                id: 'floor-element-8',
                type: 'stool',
                label: 'Stool 1',
                x: 1,
                y: 5,
                width: 1,
                height: 1,
                tableId: 'stool-1',
                shape: 'round',
                sortOrder: 8,
              },
              {
                id: 'floor-element-11',
                type: 'bathroom',
                label: 'Bathroom',
                x: 13,
                y: 0,
                width: 2,
                height: 2,
                tableId: null,
                shape: null,
                sortOrder: 11,
              },
              {
                id: 'floor-element-12',
                type: 'blocked',
                label: 'Blocked area',
                x: 10,
                y: 9,
                width: 3,
                height: 2,
                tableId: null,
                shape: null,
                sortOrder: 12,
              },
            ],
          },
        ]),
      },
      restaurantTable: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, isActive: true },
          { id: 'stool-1', tableNumber: 5, name: 'Taburete 1', capacity: 1, isActive: true },
        ]),
      },
    } as never);

    const floors = await repository.findFloorsByRestaurantId('restaurant-mesaflow-centro');

    expect(floors).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      tables: [
        { id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, isActive: true },
        { id: 'stool-1', tableNumber: 5, name: 'Taburete 1', capacity: 1, isActive: true },
      ],
    });
    expect(floors?.floors[0]).toMatchObject({
      id: 'floor-main',
      name: 'Sala principal',
      rows: 12,
      columns: 16,
    });
    expect(floors?.floors[0]?.elements.map((element) => element.type)).toEqual([
      'table',
      'stool',
      'bathroom',
      'blocked',
    ]);
    expect(floors?.floors[0]?.elements[1]).toMatchObject({
      label: 'Stool 1',
      tableId: 'stool-1',
      shape: 'round',
    });
  });

  it('builds the service floor from Prisma tables, layout and active orders', async () => {
    process.env.DATABASE_URL = 'postgresql://demo';

    const findActiveOrders = vi.fn().mockResolvedValue([
      {
        id: 'order-demo-served',
        tableId: 'stool-3',
        status: 'pending_payment',
        currency: 'EUR',
        guestCount: 1,
        subtotalCents: 1190,
        taxCents: 207,
        totalCents: 1190,
        createdAt: new Date('2026-06-21T11:15:00.000Z'),
        updatedAt: new Date('2026-06-21T12:00:00.000Z'),
        lines: [
          {
            id: 'line-platter',
            productNameSnapshot: 'Plato combinado vegetal',
            quantity: 1,
            unitPriceCents: 1190,
            subtotalCents: 1190,
            status: 'served',
            courseSnapshot: 'main',
            kitchenNote: null,
            updatedAt: new Date('2026-06-21T11:58:00.000Z'),
          },
        ],
      },
    ]);

    const repository = new PrismaRestaurantReadRepository({
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({ id: 'restaurant-mesaflow-centro' }),
      },
      restaurantFloor: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'floor-main',
            restaurantId: 'restaurant-mesaflow-centro',
            name: 'Sala principal',
            rows: 12,
            columns: 16,
            elements: [
              {
                id: 'floor-element-1',
                type: 'table',
                label: 'M1',
                x: 1,
                y: 1,
                width: 2,
                height: 2,
                tableId: 'table-1',
                shape: 'square',
                sortOrder: 1,
              },
              {
                id: 'floor-element-10',
                type: 'stool',
                label: 'Stool 3',
                x: 3,
                y: 5,
                width: 1,
                height: 1,
                tableId: 'stool-3',
                shape: 'round',
                sortOrder: 10,
              },
            ],
          },
        ]),
      },
      restaurantTable: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, isActive: true },
          { id: 'stool-3', tableNumber: 7, name: 'Taburete 3', capacity: 1, isActive: true },
        ]),
      },
      order: {
        findMany: findActiveOrders,
      },
    } as never);

    const serviceFloor = await repository.findServiceFloorByRestaurantId('restaurant-mesaflow-centro');

    expect(serviceFloor).toMatchObject({
      restaurantId: 'restaurant-mesaflow-centro',
      floor: { id: 'floor-main', name: 'Sala principal', rows: 12, columns: 16 },
      totals: {
        servicePointCount: 2,
        occupiedCount: 1,
        openOrderCount: 1,
      },
    });
    expect(serviceFloor?.servicePoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: expect.objectContaining({
            id: 'stool-3',
            status: 'payment_pending',
          }),
          summary: expect.objectContaining({
            lineCount: 1,
            guestCount: 1,
            totalCents: 1190,
            currency: 'EUR',
            servicePhase: {
              course: 'none',
              status: 'no_order',
            },
          }),
        }),
      ]),
    );
    expect(findActiveOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          lines: expect.objectContaining({
            orderBy: [
              { createdAt: 'asc' },
              { id: 'asc' },
            ],
          }),
        }),
      }),
    );
  });

  it('loads the active service point order from Prisma', async () => {
    process.env.DATABASE_URL = 'postgresql://demo';

    const demoOrder = {
      id: 'order-demo-service',
      tableId: 'table-3',
      status: 'open',
      currency: 'EUR',
      subtotalCents: 2940,
      taxCents: 509,
      totalCents: 2940,
      guestCount: 2,
      createdAt: new Date('2026-06-21T12:00:00.000Z'),
      updatedAt: new Date('2026-06-21T12:25:00.000Z'),
      lines: [
        {
          id: 'line-burger',
          productNameSnapshot: 'Hamburguesa craft',
          productTypeSnapshot: 'simple',
          courseSnapshot: 'main',
          preparationRouteSnapshot: 'kitchen',
          quantity: 1,
          unitPriceCents: 1350,
          subtotalCents: 1350,
          taxRateNameSnapshot: 'IVA General',
          taxRatePercentSnapshot: { toString: () => '21' },
          taxCents: 234,
          status: 'preparing',
          kitchenNote: 'Sin cebolla',
          configurationSignature: 'rp-burger|',
          updatedAt: new Date('2026-06-21T12:20:00.000Z'),
          modifiers: [],
          comboSlots: [],
          restaurantProduct: { imageUrl: 'https://cdn.example.test/burger.jpg' },
        },
        {
          id: 'line-combo',
          productNameSnapshot: 'Menu Classic Burger',
          productTypeSnapshot: 'combo',
          courseSnapshot: 'main',
          preparationRouteSnapshot: 'kitchen',
          quantity: 1,
          unitPriceCents: 1590,
          subtotalCents: 1590,
          taxRateNameSnapshot: 'IVA General',
          taxRatePercentSnapshot: { toString: () => '21' },
          taxCents: 276,
          status: 'pending',
          kitchenNote: null,
          updatedAt: new Date('2026-06-21T12:24:00.000Z'),
          modifiers: [],
          comboSlots: [
            { slotNameSnapshot: 'Hamburguesa', selectedProductNameSnapshot: 'Classic Burger', supplementPriceCents: 0, quantity: 1 },
          ],
          restaurantProduct: null,
        },
      ],
    };
    const findServicePointOrder = vi.fn().mockResolvedValue(demoOrder);

    const repository = new PrismaRestaurantReadRepository({
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({ id: 'restaurant-mesaflow-centro' }),
      },
      restaurantFloor: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      restaurantTable: {
        findMany: vi.fn().mockResolvedValue([{ id: 'table-3', tableNumber: 3, name: 'Mesa 3', capacity: 6, isActive: true }]),
      },
      order: {
        findMany: vi.fn().mockResolvedValue([demoOrder]),
        findFirst: findServicePointOrder,
      },
    } as never);

    const order = await repository.findServicePointOrderByRestaurantId('restaurant-mesaflow-centro', 'table-3');

    expect(order).toMatchObject({
      order: {
        id: 'order-demo-service',
        tableId: 'table-3',
        status: 'open',
        totalCents: 2940,
        currency: 'EUR',
      },
      lines: [
        expect.objectContaining({
          id: 'line-burger',
          productName: 'Hamburguesa craft',
          productType: 'simple',
          preparationRoute: 'kitchen',
          status: 'preparing',
          course: 'mains',
          configurationSignature: 'rp-burger|',
          imageUrl: 'https://cdn.example.test/burger.jpg',
          modifiers: [],
          comboSlots: [],
        }),
        expect.objectContaining({
          id: 'line-combo',
          productName: 'Menu Classic Burger',
          productType: 'combo',
          preparationRoute: 'kitchen',
          status: 'pending',
          course: 'mains',
          imageUrl: null,
          comboSlots: [expect.objectContaining({ slotName: 'Hamburguesa', selectedProductName: 'Classic Burger' })],
        }),
      ],
    });
    expect(findServicePointOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          lines: expect.objectContaining({
            orderBy: [
              { createdAt: 'asc' },
              { id: 'asc' },
            ],
          }),
        }),
      }),
    );
  });
});
