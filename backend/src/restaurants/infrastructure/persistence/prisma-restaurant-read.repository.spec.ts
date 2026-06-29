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
                    product: {
                      id: 'product-burger',
                      name: 'Hamburguesa craft',
                      description: 'Carne madurada',
                      productType: 'simple',
                      defaultCourse: 'main',
                      defaultPreparationRoute: 'kitchen',
                      comboDefinition: null,
                      platterDefinition: null,
                    },
                    modifierGroups: [],
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
                    product: {
                      id: 'product-combo',
                      name: 'Menu Classic Burger',
                      description: null,
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
    expect(menu?.sections[0]?.items[0]).toMatchObject({
      restaurantProductId: 'rp-burger',
      productId: 'product-burger',
      name: 'Hamburguesa craft',
      productType: 'simple',
    });
    expect(menu?.sections[1]?.items[0]).toMatchObject({
      name: 'Menu Classic Burger',
      productType: 'combo',
      comboDefinition: { id: 'combo-1', slots: [] },
    });
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
        findMany: vi.fn().mockResolvedValue([
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
        ]),
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
          status: 'preparing',
          kitchenNote: 'Sin cebolla',
          updatedAt: new Date('2026-06-21T12:20:00.000Z'),
          modifiers: [],
          comboSlots: [],
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
          status: 'pending',
          kitchenNote: null,
          updatedAt: new Date('2026-06-21T12:24:00.000Z'),
          modifiers: [],
          comboSlots: [
            { slotNameSnapshot: 'Hamburguesa', selectedProductNameSnapshot: 'Classic Burger', supplementPriceCents: 0, quantity: 1 },
          ],
        },
      ],
    };

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
        findFirst: vi.fn().mockResolvedValue(demoOrder),
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
          comboSlots: [expect.objectContaining({ slotName: 'Hamburguesa', selectedProductName: 'Classic Burger' })],
        }),
      ],
    });
  });
});
