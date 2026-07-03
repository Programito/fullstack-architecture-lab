import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import type { RestaurantOrderDto, ServiceFloorDto, ServicePointOrderDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { MenuMockService } from '../../menu/services/menu-mock.service';
import { RestaurantContextStore } from './restaurant-context.store';
import { RestaurantPosStore } from './restaurant-pos.store';
import { OrderWriteService } from './order-write.service';

const RESTAURANT = { id: 'r-1', organizationId: 'org-demo', name: 'MesaFlow', displayName: null, timezone: 'Europe/Madrid', currency: 'EUR', isActive: true };
const TABLE_ID = 'table-1';
const ORDER_ID = 'order-existing';
const NEW_ORDER_ID = 'order-new-1';

const makeOrderDto = (id: string): RestaurantOrderDto => ({
  order: {
    id,
    restaurantId: 'r-1',
    tableId: TABLE_ID,
    status: 'open',
    currency: 'EUR',
    guestCount: 1,
    subtotalCents: 1000,
    taxCents: 100,
    discountTotalCents: 0,
    totalCents: 1100,
    paidCents: 0,
    balanceCents: 1100,
    openedAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    closedAt: null,
  },
  lines: [],
  payments: [],
});

const SERVICE_POINT_ORDER: ServicePointOrderDto = {
  order: {
    id: ORDER_ID,
    tableId: TABLE_ID,
    status: 'open',
    openedAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    subtotalCents: 1000,
    taxCents: 100,
    totalCents: 1100,
    currency: 'EUR',
  },
  lines: [],
};

const EMPTY_FLOOR: ServiceFloorDto = {
  restaurantId: 'r-1',
  floor: { id: 'floor-1', name: 'Sala', rows: 4, columns: 4 },
  elements: [],
  servicePoints: [],
  totals: { servicePointCount: 0, occupiedCount: 0, openOrderCount: 0 },
};

describe('OrderWriteService', () => {
  let mockAddProductToSelectedTable: ReturnType<typeof vi.fn>;
  let mockAddCustomizedProductToSelectedTable: ReturnType<typeof vi.fn>;
  let mockAddConfiguredComboToSelectedTable: ReturnType<typeof vi.fn>;
  let mockHydrateServicePointOrder: ReturnType<typeof vi.fn>;
  let mockHydrateServiceFloor: ReturnType<typeof vi.fn>;
  let mockReportApiError: ReturnType<typeof vi.fn>;
  let mockSelectedTableId: ReturnType<typeof vi.fn>;
  let mockSelectedOrder: ReturnType<typeof vi.fn>;
  let mockProducts: ReturnType<typeof vi.fn>;
  let mockActiveRestaurant: ReturnType<typeof vi.fn>;
  let mockModifierGroups: ReturnType<typeof vi.fn>;
  let mockOpenRestaurantOrder: ReturnType<typeof vi.fn>;
  let mockAddRestaurantOrderLine: ReturnType<typeof vi.fn>;
  let mockGetRestaurantServicePointOrder: ReturnType<typeof vi.fn>;
  let mockGetRestaurantServiceFloor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAddProductToSelectedTable = vi.fn();
    mockAddCustomizedProductToSelectedTable = vi.fn();
    mockAddConfiguredComboToSelectedTable = vi.fn();
    mockHydrateServicePointOrder = vi.fn();
    mockHydrateServiceFloor = vi.fn();
    mockReportApiError = vi.fn();
    mockSelectedTableId = vi.fn(() => TABLE_ID);
    mockSelectedOrder = vi.fn(() => ({ id: ORDER_ID, tableId: TABLE_ID, lines: [], total: 0, status: 'open', paymentMethod: 'pending' }));
    mockProducts = vi.fn(() => [
      { id: 'product-1', restaurantProductId: 'rp-1', name: 'Cerveza', categoryId: 'cat-1', basePrice: 2.5, available: true, course: 'drinks', type: 'simple', modifierGroupIds: [], preparationPolicy: { route: 'bar', requiresReadyBeforeServe: false } },
      { id: 'product-2', name: 'Café', categoryId: 'cat-1', basePrice: 1.5, available: true, course: 'drinks', type: 'simple', modifierGroupIds: [], preparationPolicy: { route: 'bar', requiresReadyBeforeServe: false } },
    ]);
    mockActiveRestaurant = vi.fn(() => RESTAURANT);
    mockModifierGroups = vi.fn(() => []);
    mockOpenRestaurantOrder = vi.fn(() => of(makeOrderDto(NEW_ORDER_ID)));
    mockAddRestaurantOrderLine = vi.fn(() => of(makeOrderDto(ORDER_ID)));
    mockGetRestaurantServicePointOrder = vi.fn(() => of(SERVICE_POINT_ORDER));
    mockGetRestaurantServiceFloor = vi.fn(() => of(EMPTY_FLOOR));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        OrderWriteService,
        {
          provide: RestaurantPosStore,
          useValue: {
            addProductToSelectedTable: mockAddProductToSelectedTable,
            addCustomizedProductToSelectedTable: mockAddCustomizedProductToSelectedTable,
            addConfiguredComboToSelectedTable: mockAddConfiguredComboToSelectedTable,
            hydrateServicePointOrder: mockHydrateServicePointOrder,
            hydrateServiceFloor: mockHydrateServiceFloor,
            reportApiError: mockReportApiError,
            selectedTableId: mockSelectedTableId,
            selectedOrder: mockSelectedOrder,
            products: mockProducts,
          },
        },
        {
          provide: RestaurantContextStore,
          useValue: { activeRestaurant: mockActiveRestaurant },
        },
        {
          provide: RestaurantPosApiService,
          useValue: {
            openRestaurantOrder: mockOpenRestaurantOrder,
            addRestaurantOrderLine: mockAddRestaurantOrderLine,
            getRestaurantServicePointOrder: mockGetRestaurantServicePointOrder,
            getRestaurantServiceFloor: mockGetRestaurantServiceFloor,
          },
        },
        {
          provide: MenuMockService,
          useValue: { modifierGroups: mockModifierGroups },
        },
      ],
    });

    return TestBed.inject(OrderWriteService);
  }

  describe('addProduct', () => {
    it('no actualiza el store localmente antes de recibir respuesta del servidor', () => {
      const service = setup();
      service.addProduct('product-1');
      expect(mockAddProductToSelectedTable).not.toHaveBeenCalled();
    });

    it('no llama a la API cuando el producto no tiene restaurantProductId', () => {
      const service = setup();
      service.addProduct('product-2');
      expect(mockOpenRestaurantOrder).not.toHaveBeenCalled();
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('no llama a la API cuando no hay restaurante activo', () => {
      mockActiveRestaurant.mockReturnValue(null);
      const service = setup();
      service.addProduct('product-1');
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('no llama a la API cuando no hay mesa seleccionada', () => {
      mockSelectedTableId.mockReturnValue(null);
      const service = setup();
      service.addProduct('product-1');
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('llama a addRestaurantOrderLine directamente cuando ya existe un orderId en el store', () => {
      const service = setup();
      service.addProduct('product-1');
      expect(mockOpenRestaurantOrder).not.toHaveBeenCalled();
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith('r-1', ORDER_ID, {
        restaurantProductId: 'rp-1',
        quantity: 1,
        kitchenNote: null,
        modifiers: [],
        comboSlots: [],
        platterComponents: [],
      });
    });

    it('abre el pedido primero cuando no hay orderId, luego añade la línea', () => {
      mockSelectedOrder.mockReturnValue({ id: undefined, tableId: TABLE_ID, lines: [], total: 0, status: 'open', paymentMethod: 'pending' });
      const service = setup();
      service.addProduct('product-1');
      expect(mockOpenRestaurantOrder).toHaveBeenCalledWith('r-1', TABLE_ID, 1);
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith('r-1', NEW_ORDER_ID, expect.any(Object));
    });

    it('abre el pedido primero cuando selectedOrder es null', () => {
      mockSelectedOrder.mockReturnValue(null);
      const service = setup();
      service.addProduct('product-1');
      expect(mockOpenRestaurantOrder).toHaveBeenCalledWith('r-1', TABLE_ID, 1);
    });

    it('recarga el pedido del punto de servicio y lo hidrata en el store tras un añadido exitoso', () => {
      const service = setup();
      service.addProduct('product-1');
      expect(mockGetRestaurantServicePointOrder).toHaveBeenCalledWith('r-1', TABLE_ID);
      expect(mockHydrateServicePointOrder).toHaveBeenCalledWith(TABLE_ID, expect.anything());
    });

    it('muestra error, recarga el pedido y la planta cuando addRestaurantOrderLine falla', () => {
      mockAddRestaurantOrderLine.mockReturnValue(throwError(() => new Error('network error')));
      const service = setup();
      service.addProduct('product-1');
      expect(mockReportApiError).toHaveBeenCalledWith('restaurantPos.errors.addLineFailed');
      expect(mockGetRestaurantServicePointOrder).toHaveBeenCalledWith('r-1', TABLE_ID);
      expect(mockHydrateServicePointOrder).toHaveBeenCalled();
      expect(mockGetRestaurantServiceFloor).toHaveBeenCalledWith('r-1');
      expect(mockHydrateServiceFloor).toHaveBeenCalled();
    });

    it('muestra error y recarga la planta cuando openRestaurantOrder falla', () => {
      mockSelectedOrder.mockReturnValue(null);
      mockOpenRestaurantOrder.mockReturnValue(throwError(() => new Error('network error')));
      const service = setup();
      service.addProduct('product-1');
      expect(mockReportApiError).toHaveBeenCalledWith('restaurantPos.errors.addLineFailed');
      expect(mockGetRestaurantServiceFloor).toHaveBeenCalledWith('r-1');
    });
  });

  describe('addCustomizedProduct', () => {
    it('no actualiza el store localmente antes de recibir respuesta del servidor', () => {
      const service = setup();
      service.addCustomizedProduct('product-1', ['opt-medium'], 'sin sal');
      expect(mockAddCustomizedProductToSelectedTable).not.toHaveBeenCalled();
    });

    it('incluye los modificadores en la petición al backend cuando coinciden con el grupo del producto', () => {
      mockProducts.mockReturnValue([
        {
          id: 'product-1',
          restaurantProductId: 'rp-1',
          name: 'Hamburguesa',
          categoryId: 'cat-1',
          basePrice: 10,
          available: true,
          course: 'main',
          type: 'simple',
          modifierGroupIds: ['group-punto'],
          preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true },
        },
      ]);
      mockModifierGroups.mockReturnValue([
        {
          id: 'group-punto',
          name: 'Punto de la carne',
          type: 'single',
          required: true,
          minSelections: 1,
          maxSelections: 1,
          options: [
            { id: 'opt-medium', name: 'Al punto', priceDelta: 0 },
            { id: 'opt-well', name: 'Bien hecho', priceDelta: 0 },
          ],
        },
      ]);
      const service = setup();
      service.addCustomizedProduct('product-1', ['opt-medium'], '');
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith(
        'r-1',
        ORDER_ID,
        expect.objectContaining({
          modifiers: [{ modifierGroupId: 'group-punto', modifierOptionId: 'opt-medium', quantity: 1 }],
        }),
      );
    });

    it('envía kitchenNote recortada al backend', () => {
      const service = setup();
      service.addCustomizedProduct('product-1', [], '  sin gluten  ');
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith(
        'r-1',
        ORDER_ID,
        expect.objectContaining({ kitchenNote: 'sin gluten' }),
      );
    });

    it('envía kitchenNote null cuando está vacía', () => {
      const service = setup();
      service.addCustomizedProduct('product-1', [], '');
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith(
        'r-1',
        ORDER_ID,
        expect.objectContaining({ kitchenNote: null }),
      );
    });
  });

  describe('addCombo', () => {
    const COMBO_PRODUCT = {
      id: 'rp-combo-1',
      restaurantProductId: 'rp-combo-1',
      name: 'Menú Classic',
      categoryId: 'cat-menus',
      basePrice: 13.5,
      available: true,
      course: 'main' as const,
      type: 'combo' as const,
      modifierGroupIds: [],
      preparationPolicy: { route: 'kitchen' as const, requiresReadyBeforeServe: true },
    };
    const SLOT_BURGER = {
      id: 'rp-burger-1',
      restaurantProductId: 'rp-burger-1',
      name: 'Hamburguesa',
      categoryId: 'cat-1',
      basePrice: 12,
      available: true,
      course: 'main' as const,
      type: 'simple' as const,
      modifierGroupIds: [],
      preparationPolicy: { route: 'kitchen' as const, requiresReadyBeforeServe: true },
    };
    const SLOT_DRINK = {
      id: 'rp-drink-1',
      restaurantProductId: 'rp-drink-1',
      name: 'Bebida',
      categoryId: 'cat-1',
      basePrice: 2,
      available: true,
      course: 'drinks' as const,
      type: 'simple' as const,
      modifierGroupIds: [],
      preparationPolicy: { route: 'bar' as const, requiresReadyBeforeServe: false },
    };

    it('no actualiza el store localmente antes de recibir respuesta del servidor', () => {
      const service = setup();
      service.addCombo('combo-1', [{ slotId: 'slot-1', selectedProductIds: ['product-3'] }]);
      expect(mockAddConfiguredComboToSelectedTable).not.toHaveBeenCalled();
    });

    it('no llama a la API cuando el combo no tiene restaurantProductId', () => {
      const service = setup();
      service.addCombo('combo-1', []);
      expect(mockOpenRestaurantOrder).not.toHaveBeenCalled();
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('no llama a la API cuando no hay restaurante activo', () => {
      mockActiveRestaurant.mockReturnValue(null);
      mockProducts.mockReturnValue([COMBO_PRODUCT]);
      const service = setup();
      service.addCombo('rp-combo-1', []);
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('no llama a la API cuando no hay mesa seleccionada', () => {
      mockSelectedTableId.mockReturnValue(null);
      mockProducts.mockReturnValue([COMBO_PRODUCT]);
      const service = setup();
      service.addCombo('rp-combo-1', []);
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('llama a addRestaurantOrderLine con los comboSlots correctos', () => {
      mockProducts.mockReturnValue([COMBO_PRODUCT, SLOT_BURGER, SLOT_DRINK]);
      const service = setup();
      service.addCombo('rp-combo-1', [
        { slotId: 'slot-burger', selectedProductIds: ['rp-burger-1'] },
        { slotId: 'slot-drink', selectedProductIds: ['rp-drink-1'] },
      ]);
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith('r-1', ORDER_ID, {
        restaurantProductId: 'rp-combo-1',
        quantity: 1,
        kitchenNote: null,
        modifiers: [],
        comboSlots: [
          { comboSlotId: 'slot-burger', restaurantProductId: 'rp-burger-1', quantity: 1 },
          { comboSlotId: 'slot-drink', restaurantProductId: 'rp-drink-1', quantity: 1 },
        ],
        platterComponents: [],
      });
    });

    it('abre el pedido primero cuando no hay orderId, luego añade la línea de combo', () => {
      mockSelectedOrder.mockReturnValue(null);
      mockProducts.mockReturnValue([COMBO_PRODUCT]);
      const service = setup();
      service.addCombo('rp-combo-1', []);
      expect(mockOpenRestaurantOrder).toHaveBeenCalledWith('r-1', TABLE_ID, 1);
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith('r-1', NEW_ORDER_ID, expect.any(Object));
    });

    it('recarga el pedido del punto de servicio tras un sync de combo exitoso', () => {
      mockProducts.mockReturnValue([COMBO_PRODUCT]);
      const service = setup();
      service.addCombo('rp-combo-1', []);
      expect(mockGetRestaurantServicePointOrder).toHaveBeenCalledWith('r-1', TABLE_ID);
      expect(mockHydrateServicePointOrder).toHaveBeenCalled();
    });

    it('muestra error y recarga la planta cuando el sync del combo falla', () => {
      mockAddRestaurantOrderLine.mockReturnValue(throwError(() => new Error('network error')));
      mockProducts.mockReturnValue([COMBO_PRODUCT]);
      const service = setup();
      service.addCombo('rp-combo-1', []);
      expect(mockReportApiError).toHaveBeenCalledWith('restaurantPos.errors.addLineFailed');
      expect(mockGetRestaurantServiceFloor).toHaveBeenCalledWith('r-1');
    });

    it('omite slots cuyo producto seleccionado no tiene restaurantProductId', () => {
      const mockDrink = { id: 'mock-drink', name: 'Bebida mock', categoryId: 'cat-1', basePrice: 2, available: true, course: 'drinks' as const, type: 'simple' as const, modifierGroupIds: [], preparationPolicy: { route: 'bar' as const, requiresReadyBeforeServe: false } };
      mockProducts.mockReturnValue([COMBO_PRODUCT, SLOT_BURGER, mockDrink]);
      const service = setup();
      service.addCombo('rp-combo-1', [
        { slotId: 'slot-burger', selectedProductIds: ['rp-burger-1'] },
        { slotId: 'slot-drink', selectedProductIds: ['mock-drink'] },
      ]);
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith(
        'r-1',
        ORDER_ID,
        expect.objectContaining({
          comboSlots: [{ comboSlotId: 'slot-burger', restaurantProductId: 'rp-burger-1', quantity: 1 }],
        }),
      );
    });
  });
});
