import { mapRestaurantMenuComboDefinitions, mapRestaurantMenuModifierGroups, mapRestaurantMenuToProducts, mapRestaurantOrder, mapServicePointOrder } from './restaurant-pos-api.mappers';
import type { RestaurantMenuDto, RestaurantOrderDto, ServicePointOrderDto } from './restaurant-pos-api.models';

const MENU: RestaurantMenuDto = {
  id: 'menu-1',
  restaurantId: 'r-1',
  name: 'Carta principal',
  isActive: true,
  sections: [
    {
      id: 'sec-drinks',
      name: 'Bebidas',
      sortOrder: 1,
      isVisible: true,
      items: [
        {
          id: 'item-beer',
          restaurantProductId: 'rp-beer-1',
          productId: 'prod-beer',
          name: 'Cerveza',
          productType: 'simple',
          priceCents: 380,
          currency: 'EUR',
          isAvailable: true,
          isVisible: true,
          productAvailable: true,
          defaultCourse: 'drinks',
          preparationRoute: 'bar',
          modifierGroups: [
            {
              id: 'mg-size',
              name: 'Tamaño',
              selectionType: 'single',
              minSelections: 1,
              maxSelections: 1,
              isRequired: true,
              options: [
                { id: 'opt-small', name: 'Pequeña', priceDeltaCents: 0, isAvailable: true },
                { id: 'opt-large', name: 'Grande', priceDeltaCents: 80, isAvailable: true },
              ],
            },
          ],
          comboDefinition: null,
          platterComponents: [],
        },
        {
          id: 'item-water',
          restaurantProductId: 'rp-water-1',
          name: 'Agua',
          productType: 'simple',
          priceCents: 200,
          currency: 'EUR',
          isAvailable: false,
          isVisible: true,
          productAvailable: false,
          defaultCourse: 'drinks',
          preparationRoute: 'bar',
          modifierGroups: [],
          comboDefinition: null,
          platterComponents: [],
        },
      ],
    },
    {
      id: 'sec-mains',
      name: 'Platos principales',
      sortOrder: 2,
      isVisible: true,
      items: [
        {
          id: 'item-burger',
          restaurantProductId: 'rp-burger-1',
          name: 'Hamburguesa',
          productType: 'simple',
          priceCents: 1250,
          currency: 'EUR',
          isAvailable: true,
          isVisible: true,
          productAvailable: true,
          defaultCourse: 'main',
          preparationRoute: 'kitchen',
          modifierGroups: [
            {
              id: 'mg-point',
              name: 'Punto de la carne',
              selectionType: 'single',
              minSelections: 1,
              maxSelections: 1,
              isRequired: true,
              options: [
                { id: 'opt-medium', name: 'Al punto', priceDeltaCents: 0, isAvailable: true },
                { id: 'opt-well', name: 'Bien hecho', priceDeltaCents: 0, isAvailable: true },
              ],
            },
            {
              id: 'mg-size',
              name: 'Tamaño',
              selectionType: 'single',
              minSelections: 1,
              maxSelections: 1,
              isRequired: true,
              options: [
                { id: 'opt-small', name: 'Pequeña', priceDeltaCents: 0, isAvailable: true },
                { id: 'opt-large', name: 'Grande', priceDeltaCents: 80, isAvailable: true },
              ],
            },
          ],
          comboDefinition: null,
          platterComponents: [],
        },
      ],
    },
  ],
};

describe('mapRestaurantMenuToProducts', () => {
  it('devuelve un producto por cada ítem del menú', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    expect(products).toHaveLength(3);
  });

  it('usa restaurantProductId como id del producto', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    expect(products[0]!.id).toBe('rp-beer-1');
    expect(products[0]!.restaurantProductId).toBe('rp-beer-1');
  });

  it('mapea nombre, precio base y disponibilidad', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    const beer = products.find((p) => p.restaurantProductId === 'rp-beer-1')!;
    expect(beer.name).toBe('Cerveza');
    expect(beer.basePrice).toBe(3.8);
    expect(beer.available).toBe(true);
  });

  it('preserva isAvailable false para artículos no disponibles', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    const water = products.find((p) => p.restaurantProductId === 'rp-water-1')!;
    expect(water.available).toBe(false);
  });

  it('mapea el course desde defaultCourse del backend', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    const beer = products.find((p) => p.restaurantProductId === 'rp-beer-1')!;
    const burger = products.find((p) => p.restaurantProductId === 'rp-burger-1')!;
    expect(beer.course).toBe('drinks');
    expect(burger.course).toBe('main');
  });

  it('mapea el tipo de producto', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    expect(products[0]!.type).toBe('simple');
  });

  it('asigna los IDs de los grupos de modificadores del ítem', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    const beer = products.find((p) => p.restaurantProductId === 'rp-beer-1')!;
    const burger = products.find((p) => p.restaurantProductId === 'rp-burger-1')!;
    expect(beer.modifierGroupIds).toEqual(['mg-size']);
    expect(burger.modifierGroupIds).toEqual(['mg-point', 'mg-size']);
  });

  it('mapea bar → route bar con requiresReadyBeforeServe false', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    const beer = products.find((p) => p.restaurantProductId === 'rp-beer-1')!;
    expect(beer.preparationPolicy).toEqual({ route: 'bar', requiresReadyBeforeServe: false });
  });

  it('mapea kitchen → route kitchen con requiresReadyBeforeServe true', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    const burger = products.find((p) => p.restaurantProductId === 'rp-burger-1')!;
    expect(burger.preparationPolicy).toEqual({ route: 'kitchen', requiresReadyBeforeServe: true });
  });

  it('asigna el nombre de sección como category y categoryId', () => {
    const products = mapRestaurantMenuToProducts(MENU);
    const beer = products.find((p) => p.restaurantProductId === 'rp-beer-1')!;
    expect(beer.categoryId).toBe('sec-drinks');
    expect(beer.category).toBe('Bebidas');
  });

  it('usa el id del ítem como fallback cuando restaurantProductId no está presente', () => {
    const menuWithoutRpId: RestaurantMenuDto = {
      ...MENU,
      sections: [
        {
          id: 'sec-test',
          name: 'Test',
          sortOrder: 1,
          isVisible: true,
          items: [
            {
              id: 'item-only-id',
              name: 'Sin rp id',
              productType: 'simple',
              priceCents: 100,
              currency: 'EUR',
              isAvailable: true,
              isVisible: true,
              productAvailable: true,
              modifierGroups: [],
              comboDefinition: null,
              platterComponents: [],
            },
          ],
        },
      ],
    };
    const products = mapRestaurantMenuToProducts(menuWithoutRpId);
    expect(products[0]!.id).toBe('item-only-id');
    expect(products[0]!.restaurantProductId).toBeUndefined();
  });
});

describe('mapRestaurantMenuModifierGroups', () => {
  it('recoge todos los grupos de modificadores únicos del menú', () => {
    const groups = mapRestaurantMenuModifierGroups(MENU);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.id).sort()).toEqual(['mg-point', 'mg-size'].sort());
  });

  it('deduplica los grupos que aparecen en varios ítems', () => {
    // mg-size aparece en beer y en burger, solo debe aparecer una vez
    const groups = mapRestaurantMenuModifierGroups(MENU);
    const sizeGroups = groups.filter((g) => g.id === 'mg-size');
    expect(sizeGroups).toHaveLength(1);
  });

  it('mapea name, required, minSelections y maxSelections', () => {
    const groups = mapRestaurantMenuModifierGroups(MENU);
    const sizeGroup = groups.find((g) => g.id === 'mg-size')!;
    expect(sizeGroup.name).toBe('Tamaño');
    expect(sizeGroup.required).toBe(true);
    expect(sizeGroup.minSelections).toBe(1);
    expect(sizeGroup.maxSelections).toBe(1);
  });

  it('mapea selectionType single → type single', () => {
    const groups = mapRestaurantMenuModifierGroups(MENU);
    const sizeGroup = groups.find((g) => g.id === 'mg-size')!;
    expect(sizeGroup.type).toBe('single');
  });

  it('mapea selectionType multiple → type multiple', () => {
    const menuWithMultiple: RestaurantMenuDto = {
      ...MENU,
      sections: [
        {
          id: 'sec-test',
          name: 'Test',
          sortOrder: 1,
          isVisible: true,
          items: [
            {
              id: 'item-test',
              restaurantProductId: 'rp-test',
              name: 'Test',
              productType: 'simple',
              priceCents: 100,
              currency: 'EUR',
              isAvailable: true,
              isVisible: true,
              productAvailable: true,
              modifierGroups: [
                {
                  id: 'mg-extras',
                  name: 'Extras',
                  selectionType: 'multiple',
                  minSelections: 0,
                  maxSelections: 3,
                  isRequired: false,
                  options: [],
                },
              ],
              comboDefinition: null,
              platterComponents: [],
            },
          ],
        },
      ],
    };
    const groups = mapRestaurantMenuModifierGroups(menuWithMultiple);
    expect(groups[0]!.type).toBe('multiple');
  });

  it('mapea las opciones con priceDelta en euros', () => {
    const groups = mapRestaurantMenuModifierGroups(MENU);
    const sizeGroup = groups.find((g) => g.id === 'mg-size')!;
    expect(sizeGroup.options).toHaveLength(2);
    expect(sizeGroup.options[0]).toEqual({ id: 'opt-small', name: 'Pequeña', priceDelta: 0 });
    expect(sizeGroup.options[1]).toEqual({ id: 'opt-large', name: 'Grande', priceDelta: 0.8 });
  });

  it('devuelve lista vacía cuando el menú no tiene modificadores', () => {
    const emptyMenu: RestaurantMenuDto = {
      ...MENU,
      sections: [
        {
          id: 'sec-test',
          name: 'Test',
          sortOrder: 1,
          isVisible: true,
          items: [
            {
              id: 'item-test',
              restaurantProductId: 'rp-test',
              name: 'Test',
              productType: 'simple',
              priceCents: 100,
              currency: 'EUR',
              isAvailable: true,
              isVisible: true,
              productAvailable: true,
              modifierGroups: [],
              comboDefinition: null,
              platterComponents: [],
            },
          ],
        },
      ],
    };
    expect(mapRestaurantMenuModifierGroups(emptyMenu)).toHaveLength(0);
  });
});

describe('mapRestaurantMenuComboDefinitions', () => {
  const COMBO_MENU: RestaurantMenuDto = {
    id: 'menu-1',
    restaurantId: 'r-1',
    name: 'Carta',
    isActive: true,
    sections: [
      {
        id: 'sec-menus',
        name: 'Menús',
        sortOrder: 1,
        isVisible: true,
        items: [
          {
            id: 'item-menu-classic',
            restaurantProductId: 'rp-menu-classic',
            name: 'Menú Clásico',
            productType: 'combo',
            priceCents: 1350,
            currency: 'EUR',
            isAvailable: true,
            isVisible: true,
            productAvailable: true,
            defaultCourse: 'main',
            modifierGroups: [],
            comboDefinition: {
              id: 'combo-def-classic',
              slots: [
                {
                  id: 'slot-burger',
                  name: 'Hamburguesa',
                  minSelections: 1,
                  maxSelections: 1,
                  isRequired: true,
                  options: [
                    { id: 'opt-burger-classic', restaurantProductId: 'rp-burger-classic', name: 'Hamburguesa clásica', supplementPriceCents: 0, isAvailable: true },
                    { id: 'opt-burger-truffle', restaurantProductId: 'rp-burger-truffle', name: 'Hamburguesa trufada', supplementPriceCents: 200, isAvailable: true },
                  ],
                },
                {
                  id: 'slot-drink',
                  name: 'Bebida',
                  minSelections: 1,
                  maxSelections: 1,
                  isRequired: true,
                  options: [
                    { id: 'opt-drink-cola', restaurantProductId: 'rp-cola', name: 'Coca-Cola', supplementPriceCents: 0, isAvailable: true },
                    { id: 'opt-drink-water', restaurantProductId: 'rp-water', name: 'Agua', supplementPriceCents: 0, isAvailable: false },
                  ],
                },
              ],
            },
            platterComponents: [],
          },
          {
            id: 'item-simple',
            restaurantProductId: 'rp-simple',
            name: 'Tapa simple',
            productType: 'simple',
            priceCents: 500,
            currency: 'EUR',
            isAvailable: true,
            isVisible: true,
            productAvailable: true,
            modifierGroups: [],
            comboDefinition: null,
            platterComponents: [],
          },
        ],
      },
    ],
  };

  it('devuelve una definición por cada ítem de tipo combo', () => {
    const defs = mapRestaurantMenuComboDefinitions(COMBO_MENU);
    expect(defs).toHaveLength(1);
  });

  it('usa restaurantProductId del ítem como productId de la definición', () => {
    const defs = mapRestaurantMenuComboDefinitions(COMBO_MENU);
    expect(defs[0]!.productId).toBe('rp-menu-classic');
  });

  it('mapea los slots con id, name, required, min/maxSelections', () => {
    const defs = mapRestaurantMenuComboDefinitions(COMBO_MENU);
    const slots = defs[0]!.slots;
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({ id: 'slot-burger', name: 'Hamburguesa', required: true, minSelections: 1, maxSelections: 1 });
  });

  it('usa restaurantProductId de las opciones como allowedProductIds del slot', () => {
    const defs = mapRestaurantMenuComboDefinitions(COMBO_MENU);
    expect(defs[0]!.slots[0]!.allowedProductIds).toEqual(['rp-burger-classic', 'rp-burger-truffle']);
  });

  it('asigna defaultProductId al primer producto disponible del slot', () => {
    const defs = mapRestaurantMenuComboDefinitions(COMBO_MENU);
    const drinkSlot = defs[0]!.slots.find((s) => s.id === 'slot-drink')!;
    expect(drinkSlot.defaultProductId).toBe('rp-cola');
  });

  it('extrae suplementos de opciones con supplementPriceCents mayor que cero', () => {
    const defs = mapRestaurantMenuComboDefinitions(COMBO_MENU);
    const supplements = defs[0]!.supplements;
    expect(supplements).toHaveLength(1);
    expect(supplements[0]).toEqual({ slotId: 'slot-burger', productId: 'rp-burger-truffle', supplementPrice: 2 });
  });

  it('devuelve lista vacía cuando no hay ítems de tipo combo', () => {
    const menuNoCombo: RestaurantMenuDto = { ...COMBO_MENU, sections: [{ ...COMBO_MENU.sections[0]!, items: [COMBO_MENU.sections[0]!.items[1]!] }] };
    expect(mapRestaurantMenuComboDefinitions(menuNoCombo)).toHaveLength(0);
  });

  it('usa pricingMode base_plus_supplements', () => {
    const defs = mapRestaurantMenuComboDefinitions(COMBO_MENU);
    expect(defs[0]!.pricingMode).toBe('base_plus_supplements');
  });
});

describe('mapRestaurantOrder', () => {
  it('maps the latest completed payment into lastCompletedPayment', () => {
    const orderResponse: RestaurantOrderDto = {
      order: {
        id: 'order-1',
        restaurantId: 'restaurant-1',
        tableId: 'table-1',
        status: 'paid',
        currency: 'EUR',
        guestCount: 2,
        subtotalCents: 1200,
        taxCents: 0,
        discountTotalCents: 0,
        totalCents: 1200,
        paidCents: 1200,
        balanceCents: 0,
        openedAt: '2026-07-17T12:00:00.000Z',
        updatedAt: '2026-07-17T12:30:00.000Z',
        closedAt: '2026-07-17T12:30:00.000Z',
      },
      lines: [],
      payments: [
        { id: 'payment-1', method: 'cash', amountCents: 600, status: 'failed', paidAt: null },
        { id: 'payment-2', method: 'card', amountCents: 1200, status: 'completed', paidAt: '2026-07-17T12:30:00.000Z' },
      ],
    };

    const order = mapRestaurantOrder(orderResponse);

    expect(order.lastCompletedPayment).toEqual({
      id: 'payment-2',
      method: 'card',
      amount: 12,
      status: 'completed',
      paidAt: '2026-07-17T12:30:00.000Z',
    });
  });
});

describe('mapServicePointOrder', () => {
  it('preserves stable product ids from service-point lines when the backend provides them', () => {
    const response: ServicePointOrderDto = {
      order: {
        id: 'order-1',
        tableId: 'table-1',
        status: 'open',
        openedAt: '2026-07-17T12:00:00.000Z',
        updatedAt: '2026-07-17T12:05:00.000Z',
        subtotalCents: 450,
        taxCents: 0,
        totalCents: 450,
        currency: 'EUR',
      },
      lines: [
        {
          id: 'line-1',
          restaurantProductId: 'rp-lemonade-1',
          productId: 'product-3',
          productName: 'Limonada con gas',
          productType: 'simple',
          quantity: 1,
          unitPriceCents: 450,
          subtotalCents: 450,
          taxRateName: null,
          taxRatePercent: null,
          taxCents: 0,
          status: 'pending',
          course: 'drinks',
          preparationRoute: 'bar',
          kitchenNote: null,
          updatedAt: '2026-07-17T12:05:00.000Z',
          modifiers: [],
          comboSlots: [],
        },
      ],
    };

    const order = mapServicePointOrder(response);

    expect(order?.lines[0]?.productId).toBe('product-3');
    expect(order?.lines[0]?.productSnapshot.productId).toBe('product-3');
  });

  it('falls back to the legacy synthetic id when service-point lines still omit product ids', () => {
    const response: ServicePointOrderDto = {
      order: {
        id: 'order-1',
        tableId: 'table-1',
        status: 'open',
        openedAt: '2026-07-17T12:00:00.000Z',
        updatedAt: '2026-07-17T12:05:00.000Z',
        subtotalCents: 1250,
        taxCents: 0,
        totalCents: 1250,
        currency: 'EUR',
      },
      lines: [
        {
          id: 'line-legacy',
          productName: 'Hamburguesa craft',
          productType: 'simple',
          quantity: 1,
          unitPriceCents: 1250,
          subtotalCents: 1250,
          taxRateName: null,
          taxRatePercent: null,
          taxCents: 0,
          status: 'pending',
          course: 'mains',
          preparationRoute: 'kitchen',
          kitchenNote: null,
          updatedAt: '2026-07-17T12:05:00.000Z',
          modifiers: [],
          comboSlots: [],
        },
      ],
    };

    const order = mapServicePointOrder(response);

    expect(order?.lines[0]?.productId).toBe('service-product:line-legacy');
  });
});
