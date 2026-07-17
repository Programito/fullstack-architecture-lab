import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import type { RestaurantOrderDto, ServiceFloorDto, ServicePointOrderDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { MenuMockService } from '../../menu/services/menu-mock.service';
import { RestaurantContextStore } from './restaurant-context.store';
import { RestaurantPosStore } from './restaurant-pos.store';
import { OrderWriteService } from './order-write.service';

const RESTAURANT = {
  id: 'r-1',
  organizationId: 'org-demo',
  name: 'MesaFlow',
  displayName: null,
  timezone: 'Europe/Madrid',
  currency: 'EUR',
  isActive: true,
};
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

const localDirectOrder = (orderId: string | undefined = ORDER_ID) => ({
  id: orderId,
  tableId: TABLE_ID,
  total: 2.5,
  status: 'open' as const,
  paymentMethod: 'pending' as const,
  lines: [
    {
      id: 'line-local-beer',
      productSnapshot: {
        productId: 'product-1',
        productName: 'Cerveza',
        productType: 'simple' as const,
        basePrice: 2.5,
        course: 'drinks' as const,
        preparationPolicy: { route: 'bar' as const, requiresReadyBeforeServe: false },
      },
      productId: 'product-1',
      productName: 'Cerveza',
      quantity: 1,
      basePrice: 2.5,
      selectedModifiers: [],
      unitPrice: 2.5,
      subtotal: 2.5,
      configurationSignature: 'product-1||',
      course: 'drinks' as const,
      status: 'pending' as const,
    },
  ],
});

describe('OrderWriteService', () => {
  let mockAddProductToSelectedTable: ReturnType<typeof vi.fn>;
  let mockAddCustomizedProductToSelectedTable: ReturnType<typeof vi.fn>;
  let mockAddConfiguredComboToSelectedTable: ReturnType<typeof vi.fn>;
  let mockIncreaseSelectedOrderLine: ReturnType<typeof vi.fn>;
  let mockDecreaseSelectedOrderLine: ReturnType<typeof vi.fn>;
  let mockRemoveSelectedOrderLine: ReturnType<typeof vi.fn>;
  let mockHydrateServicePointOrder: ReturnType<typeof vi.fn>;
  let mockHydrateServiceFloor: ReturnType<typeof vi.fn>;
  let mockReportApiError: ReturnType<typeof vi.fn>;
  let mockGetOrder: ReturnType<typeof vi.fn>;
  let mockSelectedTableId: ReturnType<typeof vi.fn>;
  let mockSelectedOrder: ReturnType<typeof vi.fn>;
  let mockProducts: ReturnType<typeof vi.fn>;
  let mockActiveRestaurant: ReturnType<typeof vi.fn>;
  let mockModifierGroups: ReturnType<typeof vi.fn>;
  let mockOpenRestaurantOrder: ReturnType<typeof vi.fn>;
  let mockAddRestaurantOrderLine: ReturnType<typeof vi.fn>;
  let mockUpdateRestaurantOrderLine: ReturnType<typeof vi.fn>;
  let mockDeleteRestaurantOrderLine: ReturnType<typeof vi.fn>;
  let mockGetRestaurantServicePointOrder: ReturnType<typeof vi.fn>;
  let mockGetRestaurantServiceFloor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockAddProductToSelectedTable = vi.fn();
    mockAddCustomizedProductToSelectedTable = vi.fn();
    mockAddConfiguredComboToSelectedTable = vi.fn();
    mockIncreaseSelectedOrderLine = vi.fn();
    mockDecreaseSelectedOrderLine = vi.fn();
    mockRemoveSelectedOrderLine = vi.fn();
    mockHydrateServicePointOrder = vi.fn();
    mockHydrateServiceFloor = vi.fn();
    mockReportApiError = vi.fn();
    mockGetOrder = vi.fn(() => localDirectOrder());
    mockSelectedTableId = vi.fn(() => TABLE_ID);
    mockSelectedOrder = vi.fn(() => ({ id: ORDER_ID, tableId: TABLE_ID, lines: [], total: 0, status: 'open', paymentMethod: 'pending' }));
    mockProducts = vi.fn(() => [
      {
        id: 'product-1',
        restaurantProductId: 'rp-1',
        name: 'Cerveza',
        categoryId: 'cat-1',
        basePrice: 2.5,
        available: true,
        course: 'drinks',
        type: 'simple',
        modifierGroupIds: [],
        preparationPolicy: { route: 'bar', requiresReadyBeforeServe: false },
      },
      {
        id: 'product-2',
        name: 'Cafe',
        categoryId: 'cat-1',
        basePrice: 1.5,
        available: true,
        course: 'drinks',
        type: 'simple',
        modifierGroupIds: [],
        preparationPolicy: { route: 'bar', requiresReadyBeforeServe: false },
      },
    ]);
    mockActiveRestaurant = vi.fn(() => RESTAURANT);
    mockModifierGroups = vi.fn(() => []);
    mockOpenRestaurantOrder = vi.fn(() => of(makeOrderDto(NEW_ORDER_ID)));
    mockAddRestaurantOrderLine = vi.fn(() => of(makeOrderDto(ORDER_ID)));
    mockUpdateRestaurantOrderLine = vi.fn(() => of(makeOrderDto(ORDER_ID)));
    mockDeleteRestaurantOrderLine = vi.fn(() => of(void 0));
    mockGetRestaurantServicePointOrder = vi.fn(() => of(SERVICE_POINT_ORDER));
    mockGetRestaurantServiceFloor = vi.fn(() => of(EMPTY_FLOOR));
  });

  afterEach(() => {
    vi.useRealTimers();
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
            increaseSelectedOrderLine: mockIncreaseSelectedOrderLine,
            decreaseSelectedOrderLine: mockDecreaseSelectedOrderLine,
            removeSelectedOrderLine: mockRemoveSelectedOrderLine,
            hydrateServicePointOrder: mockHydrateServicePointOrder,
            hydrateServiceFloor: mockHydrateServiceFloor,
            reportApiError: mockReportApiError,
            getOrder: mockGetOrder,
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
            updateRestaurantOrderLine: mockUpdateRestaurantOrderLine,
            deleteRestaurantOrderLine: mockDeleteRestaurantOrderLine,
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
    it('actualiza el store localmente antes de recibir respuesta del servidor', () => {
      const service = setup();
      service.addProduct('product-1');
      expect(mockAddProductToSelectedTable).toHaveBeenCalledWith('product-1');
    });

    it('no llama a la API cuando el producto no tiene restaurantProductId', () => {
      const service = setup();
      service.addProduct('product-2');
      vi.runAllTimers();
      expect(mockOpenRestaurantOrder).not.toHaveBeenCalled();
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('sincroniza el producto simple tras el debounce cuando ya existe un orderId en el store', () => {
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(of({ ...SERVICE_POINT_ORDER, lines: [] }));
      const service = setup();
      service.addProduct('product-1');
      vi.runAllTimers();
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

    it('abre el pedido primero cuando todavía no existe orderId en backend', () => {
      mockSelectedOrder.mockReturnValue({ id: undefined, tableId: TABLE_ID, lines: [], total: 0, status: 'open', paymentMethod: 'pending' });
      mockGetOrder.mockReturnValue(localDirectOrder(undefined));
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(of({ order: null, lines: [] }));
      const service = setup();
      service.addProduct('product-1');
      vi.runAllTimers();
      expect(mockOpenRestaurantOrder).toHaveBeenCalledWith('r-1', TABLE_ID, 1);
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith('r-1', NEW_ORDER_ID, expect.any(Object));
    });

    it('hidrata el pedido tras un añadido directo exitoso', () => {
      const service = setup();
      service.addProduct('product-1');
      vi.runAllTimers();
      expect(mockGetRestaurantServicePointOrder).toHaveBeenCalledWith('r-1', TABLE_ID);
      expect(mockHydrateServicePointOrder).toHaveBeenCalledWith(TABLE_ID, expect.anything());
    });

    it('muestra error, mantiene el overlay local y recarga la planta si falla la sync directa', () => {
      mockAddRestaurantOrderLine.mockReturnValue(throwError(() => new Error('network error')));
      const service = setup();
      service.addProduct('product-1');
      vi.runAllTimers();
      expect(mockReportApiError).toHaveBeenCalledWith('restaurantPos.errors.addLineFailed');
      expect(mockGetRestaurantServicePointOrder).toHaveBeenCalledWith('r-1', TABLE_ID);
      expect(mockHydrateServicePointOrder).toHaveBeenCalled();
      expect(mockGetRestaurantServiceFloor).toHaveBeenCalledWith('r-1');
    });
  });

  describe('direct quantity controls', () => {
    it('aplaza la subida de cantidad hasta el debounce', () => {
      const service = setup();
      service.increaseDirectProductQuantity('product-1');
      expect(mockIncreaseSelectedOrderLine).toHaveBeenCalledWith('product-1');
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(mockAddRestaurantOrderLine).toHaveBeenCalled();
    });

    it('el flush manual sincroniza en el acto sin esperar al debounce', () => {
      const service = setup();
      service.addProduct('product-1');
      service.flushPendingDirectProducts();
      expect(mockAddRestaurantOrderLine).toHaveBeenCalled();
    });

    it('reduce una línea confirmada con update cuando queda cantidad positiva', () => {
      mockGetOrder.mockReturnValue({
        ...localDirectOrder(),
        lines: [{ ...localDirectOrder().lines[0], quantity: 1, subtotal: 2.5 }],
      });
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(
        of({
          ...SERVICE_POINT_ORDER,
          lines: [
            {
              id: 'line-backend-beer',
              restaurantProductId: 'rp-1',
              productId: 'product-1',
              productName: 'Cerveza',
              productType: 'simple',
              quantity: 2,
              unitPriceCents: 250,
              subtotalCents: 500,
              taxRateName: null,
              taxRatePercent: null,
              taxCents: 0,
              status: 'pending',
              course: 'drinks',
              preparationRoute: 'bar',
              kitchenNote: null,
              updatedAt: '2024-01-01T12:00:00Z',
              modifiers: [],
              comboSlots: [],
            },
          ],
        }),
      );
      const service = setup();
      service.decreaseDirectProductQuantity('product-1');
      vi.runAllTimers();
      expect(mockUpdateRestaurantOrderLine).toHaveBeenCalledWith('r-1', ORDER_ID, 'line-backend-beer', { quantity: 1 });
    });

    it('borra la línea confirmada cuando la cantidad local baja a cero', () => {
      mockGetOrder.mockReturnValue({
        ...localDirectOrder(),
        lines: [],
      });
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(
        of({
          ...SERVICE_POINT_ORDER,
          lines: [
            {
              id: 'line-backend-beer',
              restaurantProductId: 'rp-1',
              productId: 'product-1',
              productName: 'Cerveza',
              productType: 'simple',
              quantity: 1,
              unitPriceCents: 250,
              subtotalCents: 250,
              taxRateName: null,
              taxRatePercent: null,
              taxCents: 0,
              status: 'pending',
              course: 'drinks',
              preparationRoute: 'bar',
              kitchenNote: null,
              updatedAt: '2024-01-01T12:00:00Z',
              modifiers: [],
              comboSlots: [],
            },
          ],
        }),
      );
      const service = setup();
      service.decreaseDirectProductQuantity('product-1');
      vi.runAllTimers();
      expect(mockDeleteRestaurantOrderLine).toHaveBeenCalledWith('r-1', ORDER_ID, 'line-backend-beer');
    });

    it('mantiene la cantidad local pendiente cuando entra una recarga remota desactualizada', () => {
      mockGetOrder.mockReturnValue({
        ...localDirectOrder(),
        total: 5,
        lines: [{ ...localDirectOrder().lines[0], quantity: 2, subtotal: 5 }],
      });
      const service = setup();

      service.increaseDirectProductQuantity('product-1');
      service.hydrateRemoteOrder(TABLE_ID, {
        id: ORDER_ID,
        tableId: TABLE_ID,
        total: 2.5,
        status: 'open',
        paymentMethod: 'pending',
        lines: [
          {
            ...localDirectOrder().lines[0],
            id: 'line-backend-beer',
          },
        ],
      });

      expect(mockHydrateServicePointOrder).toHaveBeenLastCalledWith(
        TABLE_ID,
        expect.objectContaining({
          total: 5,
          lines: [
            expect.objectContaining({
              productId: 'product-1',
              quantity: 2,
              subtotal: 5,
            }),
          ],
        }),
      );
    });

    it('mantiene la eliminacion local pendiente cuando entra una recarga remota antigua', () => {
      mockGetOrder.mockReturnValue({
        ...localDirectOrder(),
        lines: [],
        total: 0,
      });
      const service = setup();

      service.removeDirectProduct('product-1');
      service.hydrateRemoteOrder(TABLE_ID, {
        id: ORDER_ID,
        tableId: TABLE_ID,
        total: 2.5,
        status: 'open',
        paymentMethod: 'pending',
        lines: [
          {
            ...localDirectOrder().lines[0],
            id: 'line-backend-beer',
          },
        ],
      });

      expect(mockRemoveSelectedOrderLine).toHaveBeenCalledWith('product-1');
      expect(mockHydrateServicePointOrder).toHaveBeenLastCalledWith(
        TABLE_ID,
        expect.objectContaining({
          total: 0,
          lines: [],
        }),
      );
    });
  });

  describe('addCustomizedProduct', () => {
    it('actualiza el store localmente antes de recibir respuesta del servidor', () => {
      const service = setup();
      service.addCustomizedProduct('product-1', ['opt-medium'], 'sin sal');
      expect(mockAddCustomizedProductToSelectedTable).toHaveBeenCalledWith('product-1', ['opt-medium'], 'sin sal');
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
  });

  describe('addCombo', () => {
    const comboProduct = {
      id: 'rp-combo-1',
      restaurantProductId: 'rp-combo-1',
      name: 'Menu Classic',
      categoryId: 'cat-menus',
      basePrice: 13.5,
      available: true,
      course: 'main' as const,
      type: 'combo' as const,
      modifierGroupIds: [],
      preparationPolicy: { route: 'kitchen' as const, requiresReadyBeforeServe: true },
    };

    it('actualiza el store localmente antes de recibir respuesta del servidor', () => {
      mockProducts.mockReturnValue([comboProduct]);
      const service = setup();
      service.addCombo('rp-combo-1', [{ slotId: 'slot-1', selectedProductIds: ['product-3'] }]);
      expect(mockAddConfiguredComboToSelectedTable).toHaveBeenCalledWith('rp-combo-1', [{ slotId: 'slot-1', selectedProductIds: ['product-3'] }]);
    });

    it('sincroniza el combo inmediatamente con el backend', () => {
      mockProducts.mockReturnValue([
        comboProduct,
        {
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
        },
      ]);
      const service = setup();
      service.addCombo('rp-combo-1', [{ slotId: 'slot-burger', selectedProductIds: ['rp-burger-1'] }]);
      expect(mockAddRestaurantOrderLine).toHaveBeenCalledWith(
        'r-1',
        ORDER_ID,
        expect.objectContaining({
          restaurantProductId: 'rp-combo-1',
          comboSlots: [{ comboSlotId: 'slot-burger', restaurantProductId: 'rp-burger-1', quantity: 1 }],
        }),
      );
    });
  });
});
