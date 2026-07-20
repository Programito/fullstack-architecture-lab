import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import type { RestaurantOrderDto, ServiceFloorDto, ServicePointOrderDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { MenuMockService } from '../../menu/services/menu-mock.service';
import { RestaurantContextStore } from './restaurant-context.store';
import { RestaurantFloorLoader } from './restaurant-floor-loader.service';
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

const backendDirectLine = (
  id: string,
  quantity = 1,
  overrides: Partial<ServicePointOrderDto['lines'][number]> = {},
): ServicePointOrderDto['lines'][number] => ({
  id,
  restaurantProductId: 'rp-1',
  productId: 'catalog-product-1',
  productName: 'Cerveza',
  productType: 'simple',
  quantity,
  unitPriceCents: 250,
  subtotalCents: 250 * quantity,
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
  ...overrides,
});

describe('OrderWriteService', () => {
  let mockAddProductToSelectedTable: ReturnType<typeof vi.fn>;
  let mockAddCustomizedProductToSelectedTable: ReturnType<typeof vi.fn>;
  let mockAddConfiguredComboToSelectedTable: ReturnType<typeof vi.fn>;
  let mockAdjustSelectedOrderLineQuantityById: ReturnType<typeof vi.fn>;
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
  let mockRefreshFloor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockAddProductToSelectedTable = vi.fn();
    mockAddCustomizedProductToSelectedTable = vi.fn();
    mockAddConfiguredComboToSelectedTable = vi.fn();
    mockAdjustSelectedOrderLineQuantityById = vi.fn();
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
    mockRefreshFloor = vi.fn(() => of(EMPTY_FLOOR));
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
            adjustSelectedOrderLineQuantityById: mockAdjustSelectedOrderLineQuantityById,
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
        {
          provide: RestaurantFloorLoader,
          useValue: { refresh: mockRefreshFloor },
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

    it('no duplica una línea cuando el backend usa productId maestro y restaurantProductId de venta', () => {
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(
        of({
          ...SERVICE_POINT_ORDER,
          lines: [
            {
              id: 'line-backend-beer',
              restaurantProductId: 'rp-1',
              productId: 'catalog-product-1',
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
            {
              id: 'line-backend-beer-duplicate',
              restaurantProductId: 'rp-1',
              productId: 'catalog-product-1',
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
              updatedAt: '2024-01-01T12:00:01Z',
              modifiers: [],
              comboSlots: [],
            },
          ],
        }),
      );
      const service = setup();

      service.addProduct('product-1');
      vi.runAllTimers();

      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
      expect(mockDeleteRestaurantOrderLine).toHaveBeenCalledWith('r-1', ORDER_ID, 'line-backend-beer-duplicate');
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
      expect(mockRefreshFloor).toHaveBeenCalledWith('r-1');
      expect(mockGetRestaurantServiceFloor).not.toHaveBeenCalled();
    });

    it('ignora el recovery tardío de un restaurante anterior sin alterar el restaurante activo', () => {
      const lateMutation = new Subject<RestaurantOrderDto>();
      mockAddRestaurantOrderLine.mockReturnValue(lateMutation.asObservable());
      const service = setup();

      service.addProduct('product-1');
      vi.runAllTimers();
      expect(mockAddRestaurantOrderLine).toHaveBeenCalled();

      mockGetRestaurantServicePointOrder.mockClear();
      mockHydrateServicePointOrder.mockClear();
      mockRefreshFloor.mockClear();
      mockActiveRestaurant.mockReturnValue({ ...RESTAURANT, id: 'r-2' });
      lateMutation.error(new Error('late failure from r-1'));

      expect(mockReportApiError).not.toHaveBeenCalled();
      expect(mockGetRestaurantServicePointOrder).not.toHaveBeenCalled();
      expect(mockHydrateServicePointOrder).not.toHaveBeenCalled();
      expect(mockRefreshFloor).not.toHaveBeenCalled();
    });

    it('no hidrata un recovery iniciado en A si el contexto cambia a B antes de su respuesta', () => {
      const lateMutation = new Subject<RestaurantOrderDto>();
      const recoveryOrder = new Subject<ServicePointOrderDto>();
      mockAddRestaurantOrderLine.mockReturnValue(lateMutation.asObservable());
      mockGetRestaurantServicePointOrder
        .mockReturnValueOnce(of(SERVICE_POINT_ORDER))
        .mockReturnValueOnce(recoveryOrder.asObservable());
      const service = setup();

      service.addProduct('product-1');
      vi.runAllTimers();
      lateMutation.error(new Error('failure while A is active'));
      expect(mockGetRestaurantServicePointOrder).toHaveBeenCalledTimes(2);

      mockHydrateServicePointOrder.mockClear();
      mockActiveRestaurant.mockReturnValue({ ...RESTAURANT, id: 'r-2' });
      recoveryOrder.next(SERVICE_POINT_ORDER);
      recoveryOrder.complete();

      expect(mockHydrateServicePointOrder).not.toHaveBeenCalled();
    });
  });

  describe('direct quantity controls', () => {
    it('aplaza la subida de cantidad hasta el debounce', () => {
      const service = setup();
      service.increaseDirectProductQuantity('product-1');
      expect(mockAdjustSelectedOrderLineQuantityById).toHaveBeenCalledWith('line-local-beer', 1);
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(mockAddRestaurantOrderLine).toHaveBeenCalled();
    });

    it('el flush observable espera hasta que termina la sincronizacion directa', () => {
      const pendingAdd = new Subject<RestaurantOrderDto>();
      mockAddRestaurantOrderLine.mockReturnValue(pendingAdd.asObservable());
      mockGetRestaurantServicePointOrder
        .mockReturnValueOnce(of({ ...SERVICE_POINT_ORDER, lines: [] }))
        .mockReturnValueOnce(of({ ...SERVICE_POINT_ORDER, lines: [backendDirectLine('line-backend-beer')] }));
      const service = setup();
      let completed = false;

      service.addProduct('product-1');
      service.flushPendingDirectProducts$().subscribe({ complete: () => { completed = true; } });

      expect(mockAddRestaurantOrderLine).toHaveBeenCalled();
      expect(completed).toBe(false);

      pendingAdd.next(makeOrderDto(ORDER_ID));
      pendingAdd.complete();

      expect(completed).toBe(true);
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
      const mutableOrder = localDirectOrder();
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockAdjustSelectedOrderLineQuantityById.mockImplementation(() => mutableOrder.lines.splice(0, 1));
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

    it('preserva el orden remoto al reconciliar una subida pendiente de la linea intermedia', () => {
      const localMiddleLine = {
        ...localDirectOrder().lines[0],
        id: 'line-local-b',
        productName: 'B',
        productSnapshot: {
          ...localDirectOrder().lines[0].productSnapshot,
          productName: 'B',
        },
      };
      const mutableOrder = {
        ...localDirectOrder(),
        lines: [localMiddleLine],
      };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockAdjustSelectedOrderLineQuantityById.mockImplementation((lineId: string, delta: number) => {
        const line = mutableOrder.lines.find((candidate) => candidate.id === lineId);
        if (!line) return;
        line.quantity += delta;
        line.subtotal = line.quantity * line.unitPrice;
        mutableOrder.total = line.subtotal;
      });
      const remoteMiddleLine = {
        ...localMiddleLine,
        id: 'line-remote-b',
        quantity: 1,
        subtotal: 2.5,
      };
      const unrelatedLine = (id: string, productId: string, productName: string) => ({
        ...remoteMiddleLine,
        id,
        productId,
        productName,
        productSnapshot: {
          ...remoteMiddleLine.productSnapshot,
          productId,
          productName,
        },
        configurationSignature: `${productId}||`,
      });
      const service = setup();

      service.increaseDirectProductQuantity('product-1', 'line-local-b');
      service.hydrateRemoteOrder(TABLE_ID, {
        ...localDirectOrder(),
        total: 7.5,
        lines: [
          unrelatedLine('line-remote-a', 'product-a', 'A'),
          remoteMiddleLine,
          unrelatedLine('line-remote-c', 'product-c', 'C'),
        ],
      });

      const hydratedOrder = mockHydrateServicePointOrder.mock.calls.at(-1)?.[1];
      expect(hydratedOrder.lines.map((line: { productName: string }) => line.productName)).toEqual(['A', 'B', 'C']);
      expect(hydratedOrder.lines[1]).toEqual(expect.objectContaining({ productName: 'B', quantity: 2, subtotal: 5 }));
    });

    it('mantiene la eliminacion local pendiente cuando entra una recarga remota antigua', () => {
      const mutableOrder = localDirectOrder();
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockRemoveSelectedOrderLine.mockImplementation(() => {
        mutableOrder.lines.splice(0, 1);
        mutableOrder.total = 0;
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

      expect(mockRemoveSelectedOrderLine).toHaveBeenCalledWith('line-local-beer');
      expect(mockHydrateServicePointOrder).toHaveBeenLastCalledWith(
        TABLE_ID,
        expect.objectContaining({
          total: 0,
          lines: [],
        }),
      );
    });

    it('converge three rapid increments over duplicate clean lines into one backend line', () => {
      const firstCleanLine = { ...localDirectOrder().lines[0], id: 'line-clean-1' };
      const secondCleanLine = { ...localDirectOrder().lines[0], id: 'line-clean-2' };
      const mutableOrder = {
        ...localDirectOrder(),
        total: 5,
        lines: [firstCleanLine, secondCleanLine],
      };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockAdjustSelectedOrderLineQuantityById.mockImplementation((lineIdOrProductId: string, delta: number) => {
        const line = mutableOrder.lines.find(
          (candidate) => candidate.id === lineIdOrProductId || candidate.productId === lineIdOrProductId,
        );
        if (!line) return;
        line.quantity += delta;
        line.subtotal = line.quantity * line.unitPrice;
      });
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(
        of({
          ...SERVICE_POINT_ORDER,
          lines: [backendDirectLine('line-clean-1'), backendDirectLine('line-clean-2')],
        }),
      );
      const service = setup();

      service.increaseDirectProductQuantity('product-1', 'line-clean-1');
      service.increaseDirectProductQuantity('product-1', 'line-clean-1');
      service.increaseDirectProductQuantity('product-1', 'line-clean-1');
      vi.runAllTimers();

      expect(mockAdjustSelectedOrderLineQuantityById).toHaveBeenCalledTimes(3);
      expect(mockAdjustSelectedOrderLineQuantityById).toHaveBeenNthCalledWith(1, 'line-clean-1', 1);
      expect(mockUpdateRestaurantOrderLine).toHaveBeenCalledWith('r-1', ORDER_ID, 'line-clean-1', { quantity: 5 });
      expect(mockDeleteRestaurantOrderLine).toHaveBeenCalledWith('r-1', ORDER_ID, 'line-clean-2');
    });

    it('reconciles only the visual group selected by signature and unit price', () => {
      const selectedLine = {
        ...localDirectOrder().lines[0],
        id: 'line-signature-a',
        configurationSignature: 'rp-1|signature-a',
      };
      const differentSignature = {
        ...localDirectOrder().lines[0],
        id: 'line-signature-b',
        quantity: 4,
        subtotal: 10,
        configurationSignature: 'rp-1|signature-b',
      };
      const differentPrice = {
        ...localDirectOrder().lines[0],
        id: 'line-price-b',
        quantity: 5,
        unitPrice: 3,
        subtotal: 15,
        configurationSignature: 'rp-1|signature-a',
      };
      const mutableOrder = {
        ...localDirectOrder(),
        total: 27.5,
        lines: [selectedLine, differentSignature, differentPrice],
      };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockAdjustSelectedOrderLineQuantityById.mockImplementation((lineId: string, delta: number) => {
        const line = mutableOrder.lines.find((candidate) => candidate.id === lineId);
        if (!line) return;
        line.quantity += delta;
        line.subtotal = line.quantity * line.unitPrice;
      });
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(
        of({
          ...SERVICE_POINT_ORDER,
          lines: [
            backendDirectLine('line-signature-a', 1, { configurationSignature: 'rp-1|signature-a' }),
            backendDirectLine('line-signature-b', 4, { configurationSignature: 'rp-1|signature-b' }),
            backendDirectLine('line-price-b', 5, {
              configurationSignature: 'rp-1|signature-a',
              unitPriceCents: 300,
              subtotalCents: 1500,
            }),
          ],
        }),
      );
      const service = setup();

      service.increaseDirectProductQuantity('product-1', 'line-signature-a');
      vi.runAllTimers();

      expect(mockUpdateRestaurantOrderLine.mock.calls).toEqual([
        ['r-1', ORDER_ID, 'line-signature-a', { quantity: 2 }],
      ]);
      expect(mockDeleteRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('removes only duplicate lines equivalent to the source visual group', () => {
      const groupLine = {
        ...localDirectOrder().lines[0],
        id: 'line-group-a-1',
        configurationSignature: 'rp-1|signature-a',
      };
      const groupDuplicate = { ...groupLine, id: 'line-group-a-2' };
      const differentSignature = {
        ...localDirectOrder().lines[0],
        id: 'line-signature-b',
        configurationSignature: 'rp-1|signature-b',
      };
      const differentPrice = {
        ...groupLine,
        id: 'line-price-b',
        unitPrice: 3,
        subtotal: 3,
      };
      const mutableOrder = {
        ...localDirectOrder(),
        total: 10.5,
        lines: [groupLine, groupDuplicate, differentSignature, differentPrice],
      };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockRemoveSelectedOrderLine.mockImplementation((lineId: string) => {
        const index = mutableOrder.lines.findIndex((candidate) => candidate.id === lineId);
        if (index >= 0) mutableOrder.lines.splice(index, 1);
      });
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(
        of({
          ...SERVICE_POINT_ORDER,
          lines: [
            backendDirectLine('line-group-a-1', 1, { configurationSignature: 'rp-1|signature-a' }),
            backendDirectLine('line-group-a-2', 1, { configurationSignature: 'rp-1|signature-a' }),
            backendDirectLine('line-signature-b', 1, { configurationSignature: 'rp-1|signature-b' }),
            backendDirectLine('line-price-b', 1, {
              configurationSignature: 'rp-1|signature-a',
              unitPriceCents: 300,
              subtotalCents: 300,
            }),
          ],
        }),
      );
      const service = setup();

      (service.removeDirectProduct as (productId: string, sourceLineId?: string) => void)(
        'product-1',
        'line-group-a-1',
      );
      vi.runAllTimers();

      expect(mockRemoveSelectedOrderLine.mock.calls).toEqual([['line-group-a-1'], ['line-group-a-2']]);
      expect(mutableOrder.lines.map((line) => line.id)).toEqual(['line-signature-b', 'line-price-b']);
      expect(mockDeleteRestaurantOrderLine.mock.calls).toEqual([
        ['r-1', ORDER_ID, 'line-group-a-2'],
        ['r-1', ORDER_ID, 'line-group-a-1'],
      ]);
    });

    it('removes a direct main-course group without touching an identical drinks group', () => {
      const mainLine = {
        ...localDirectOrder().lines[0],
        id: 'line-main-local',
        course: 'main' as const,
        productSnapshot: {
          ...localDirectOrder().lines[0].productSnapshot,
          course: 'main' as const,
        },
      };
      const drinksCollision = {
        ...localDirectOrder().lines[0],
        id: 'line-drinks-local',
      };
      const mutableOrder = {
        ...localDirectOrder(),
        total: 5,
        lines: [mainLine, drinksCollision],
      };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockRemoveSelectedOrderLine.mockImplementation((lineId: string) => {
        const index = mutableOrder.lines.findIndex((candidate) => candidate.id === lineId);
        if (index >= 0) mutableOrder.lines.splice(index, 1);
      });
      const backendOrder = {
        ...SERVICE_POINT_ORDER,
        lines: [
          backendDirectLine('line-main-backend', 1, { course: 'mains' }),
          backendDirectLine('line-drinks-backend', 1, { course: 'drinks' }),
        ],
      };
      mockGetRestaurantServicePointOrder
        .mockReturnValueOnce(of(backendOrder))
        .mockReturnValueOnce(of({ ...backendOrder, lines: [backendOrder.lines[1]!] }));
      const service = setup();

      service.removeDirectProduct('product-1', 'line-main-local');
      vi.runAllTimers();

      expect(mockRemoveSelectedOrderLine.mock.calls).toEqual([['line-main-local']]);
      expect(mutableOrder.lines.map((line) => line.id)).toEqual(['line-drinks-local']);
      expect(mockDeleteRestaurantOrderLine.mock.calls).toEqual([
        ['r-1', ORDER_ID, 'line-main-backend'],
      ]);
      expect(mockHydrateServicePointOrder).toHaveBeenLastCalledWith(
        TABLE_ID,
        expect.objectContaining({
          lines: [expect.objectContaining({ id: 'line-drinks-backend', course: 'drinks' })],
        }),
      );
    });

    it('matches explicit local-default and legacy fallback signatures to their backend groups', () => {
      const localDefault = {
        ...localDirectOrder().lines[0],
        id: 'line-local-default',
        configurationSignature: 'product-1::::',
        remote: false,
      };
      const legacyFallback = {
        ...localDirectOrder().lines[0],
        id: 'line-legacy-fallback',
        configurationSignature: 'service-config:product-1',
        remote: true,
        unitPrice: 3,
        subtotal: 3,
      };
      const mutableOrder = {
        ...localDirectOrder(),
        total: 5.5,
        lines: [localDefault, legacyFallback],
      };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockAdjustSelectedOrderLineQuantityById.mockImplementation((lineId: string, delta: number) => {
        const line = mutableOrder.lines.find((candidate) => candidate.id === lineId);
        if (line) line.quantity += delta;
      });
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(
        of({
          ...SERVICE_POINT_ORDER,
          lines: [
            backendDirectLine('line-backend-default', 1, { configurationSignature: 'rp-1|' }),
            backendDirectLine('line-backend-legacy', 1, {
              configurationSignature: undefined,
              unitPriceCents: 300,
              subtotalCents: 300,
            }),
          ],
        }),
      );
      const service = setup();

      service.increaseDirectProductQuantity('product-1', 'line-local-default');
      service.increaseDirectProductQuantity('product-1', 'line-legacy-fallback');
      vi.runAllTimers();

      expect(mockUpdateRestaurantOrderLine.mock.calls).toEqual([
        ['r-1', ORDER_ID, 'line-backend-default', { quantity: 2 }],
        ['r-1', ORDER_ID, 'line-backend-legacy', { quantity: 2 }],
      ]);
      expect(mockAddRestaurantOrderLine).not.toHaveBeenCalled();
      expect(mockDeleteRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('replaces a first local-default add with the same-price legacy backend line without duplicating quantity', () => {
      const localDefault = {
        ...localDirectOrder().lines[0],
        id: 'line-local-default',
        configurationSignature: 'product-1::::',
        remote: false,
      };
      const mutableOrder = { ...localDirectOrder(), total: 0, lines: [] as typeof localDefault[] };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockAddProductToSelectedTable.mockImplementation(() => {
        mutableOrder.lines.push(localDefault);
        mutableOrder.total = 2.5;
      });
      const legacyBackendOrder = {
        ...SERVICE_POINT_ORDER,
        lines: [backendDirectLine('line-backend-legacy', 1, { configurationSignature: undefined })],
      };
      mockGetRestaurantServicePointOrder
        .mockReturnValueOnce(of({ ...SERVICE_POINT_ORDER, lines: [] }))
        .mockReturnValueOnce(of(legacyBackendOrder));
      const service = setup();

      service.addProduct('product-1');
      vi.runAllTimers();

      expect(mockAddRestaurantOrderLine).toHaveBeenCalledTimes(1);
      expect(mockHydrateServicePointOrder).toHaveBeenLastCalledWith(
        TABLE_ID,
        expect.objectContaining({
          total: 2.5,
          lines: [expect.objectContaining({ quantity: 1, configurationSignature: 'product-1::::' })],
        }),
      );
    });

    it('uses one canonical queue when local-default and legacy fallback have the same price', () => {
      const localDefault = {
        ...localDirectOrder().lines[0],
        id: 'line-local-default',
        configurationSignature: 'product-1::::',
        remote: false,
      };
      const legacyFallback = {
        ...localDirectOrder().lines[0],
        id: 'line-legacy-fallback',
        configurationSignature: 'service-config:product-1',
        remote: true,
      };
      const mutableOrder = { ...localDirectOrder(), total: 5, lines: [localDefault, legacyFallback] };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockAdjustSelectedOrderLineQuantityById.mockImplementation((lineId: string, delta: number) => {
        const line = mutableOrder.lines.find((candidate) => candidate.id === lineId);
        if (!line) return;
        line.quantity += delta;
        line.subtotal = line.quantity * line.unitPrice;
      });
      const legacyBackendOrder = {
        ...SERVICE_POINT_ORDER,
        lines: [backendDirectLine('line-backend-legacy', 2, { configurationSignature: undefined })],
      };
      mockGetRestaurantServicePointOrder
        .mockReturnValueOnce(of(legacyBackendOrder))
        .mockReturnValueOnce(of(legacyBackendOrder));
      const service = setup();

      service.increaseDirectProductQuantity('product-1', 'line-local-default');
      service.increaseDirectProductQuantity('product-1', 'line-legacy-fallback');
      vi.runAllTimers();

      expect(mockUpdateRestaurantOrderLine.mock.calls).toEqual([
        ['r-1', ORDER_ID, 'line-backend-legacy', { quantity: 4 }],
      ]);
      expect(mockDeleteRestaurantOrderLine).not.toHaveBeenCalled();
      expect(mockHydrateServicePointOrder).toHaveBeenLastCalledWith(
        TABLE_ID,
        expect.objectContaining({ total: 10, lines: [expect.objectContaining({ quantity: 4 })] }),
      );
    });

    it('keeps an annotated line first in the order untouched and computes desired quantity from clean lines only', () => {
      const annotatedLine = {
        ...localDirectOrder().lines[0],
        id: 'line-annotated',
        quantity: 4,
        subtotal: 10,
        kitchenNote: 'Sin hielo',
      };
      const cleanLine = { ...localDirectOrder().lines[0], id: 'line-clean', quantity: 2, subtotal: 5 };
      const mutableOrder = {
        ...localDirectOrder(),
        total: 15,
        lines: [annotatedLine, cleanLine],
      };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockAdjustSelectedOrderLineQuantityById.mockImplementation((lineIdOrProductId: string, delta: number) => {
        const line = mutableOrder.lines.find(
          (candidate) => candidate.id === lineIdOrProductId || candidate.productId === lineIdOrProductId,
        );
        if (line) line.quantity += delta;
      });
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(
        of({
          ...SERVICE_POINT_ORDER,
          lines: [
            backendDirectLine('line-annotated', 4, { kitchenNote: 'Sin hielo' }),
            backendDirectLine('line-clean', 2),
          ],
        }),
      );
      const service = setup();

      service.increaseDirectProductQuantity('product-1', 'line-clean');
      service.decreaseDirectProductQuantity('product-1', 'line-clean');
      vi.runAllTimers();

      expect(mockAdjustSelectedOrderLineQuantityById).toHaveBeenCalledWith('line-clean', 1);
      expect(mockAdjustSelectedOrderLineQuantityById).toHaveBeenCalledWith('line-clean', -1);
      expect(annotatedLine.quantity).toBe(4);
      expect(cleanLine.quantity).toBe(2);
      expect(mockUpdateRestaurantOrderLine).not.toHaveBeenCalled();
      expect(mockDeleteRestaurantOrderLine).not.toHaveBeenCalled();
    });

    it('removes every clean direct line locally and in the backend while preserving the annotated line', () => {
      const annotatedLine = {
        ...localDirectOrder().lines[0],
        id: 'line-annotated',
        kitchenNote: 'Sin hielo',
      };
      const firstCleanLine = { ...localDirectOrder().lines[0], id: 'line-clean-1' };
      const secondCleanLine = { ...localDirectOrder().lines[0], id: 'line-clean-2' };
      const mutableOrder = {
        ...localDirectOrder(),
        total: 7.5,
        lines: [annotatedLine, firstCleanLine, secondCleanLine],
      };
      mockGetOrder.mockImplementation(() => mutableOrder);
      mockRemoveSelectedOrderLine.mockImplementation((lineIdOrProductId: string) => {
        const index = mutableOrder.lines.findIndex(
          (candidate) => candidate.id === lineIdOrProductId || candidate.productId === lineIdOrProductId,
        );
        if (index >= 0) mutableOrder.lines.splice(index, 1);
      });
      mockGetRestaurantServicePointOrder.mockReturnValueOnce(
        of({
          ...SERVICE_POINT_ORDER,
          lines: [
            backendDirectLine('line-annotated', 1, { kitchenNote: 'Sin hielo' }),
            backendDirectLine('line-clean-1'),
            backendDirectLine('line-clean-2'),
          ],
        }),
      );
      const service = setup();

      service.removeDirectProduct('product-1');
      vi.runAllTimers();

      expect(mockRemoveSelectedOrderLine.mock.calls).toEqual([['line-clean-1'], ['line-clean-2']]);
      expect(mutableOrder.lines).toEqual([annotatedLine]);
      expect(mockDeleteRestaurantOrderLine.mock.calls).toEqual([
        ['r-1', ORDER_ID, 'line-clean-2'],
        ['r-1', ORDER_ID, 'line-clean-1'],
      ]);
      expect(mockUpdateRestaurantOrderLine).not.toHaveBeenCalled();
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

  describe('guard de época contra respuestas obsoletas', () => {
    it('descarta una hidratación cuya época quedó atrás por una mutación local posterior', () => {
      const service = setup();
      const staleEpoch = service.orderMutationEpoch(TABLE_ID);
      service.noteLocalOrderMutation(TABLE_ID);
      service.hydrateRemoteOrder(TABLE_ID, localDirectOrder(), staleEpoch);
      expect(mockHydrateServicePointOrder).not.toHaveBeenCalled();
    });

    it('aplica una hidratación cuya época sigue vigente', () => {
      const service = setup();
      service.noteLocalOrderMutation(TABLE_ID);
      const currentEpoch = service.orderMutationEpoch(TABLE_ID);
      service.hydrateRemoteOrder(TABLE_ID, localDirectOrder(), currentEpoch);
      expect(mockHydrateServicePointOrder).toHaveBeenCalled();
    });

    it('aplica hidrataciones sin época indicada (compatibilidad con llamadas explícitas)', () => {
      const service = setup();
      service.noteLocalOrderMutation(TABLE_ID);
      service.hydrateRemoteOrder(TABLE_ID, localDirectOrder());
      expect(mockHydrateServicePointOrder).toHaveBeenCalled();
    });

    it('las épocas son independientes por mesa', () => {
      const service = setup();
      const otherTableEpoch = service.orderMutationEpoch('table-2');
      service.noteLocalOrderMutation(TABLE_ID);
      service.hydrateRemoteOrder('table-2', { ...localDirectOrder(), tableId: 'table-2' }, otherTableEpoch);
      expect(mockHydrateServicePointOrder).toHaveBeenCalled();
    });

    it('añadir un producto personalizado avanza la época de la mesa seleccionada', () => {
      const service = setup();
      const before = service.orderMutationEpoch(TABLE_ID);
      service.addCustomizedProduct('product-1', [], '');
      expect(service.orderMutationEpoch(TABLE_ID)).toBeGreaterThan(before);
    });
  });

  describe('cola serializada de mutaciones de línea', () => {
    it('ejecuta las mutaciones en orden FIFO y refresca el pedido al vaciarse la cola', () => {
      const service = setup();
      const calls: string[] = [];
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => {
        calls.push('first');
        return of(void 0);
      });
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => {
        calls.push('second');
        return of(void 0);
      });
      expect(calls).toEqual(['first', 'second']);
      expect(mockGetRestaurantServicePointOrder).toHaveBeenCalledTimes(2);
      expect(mockHydrateServicePointOrder).toHaveBeenCalled();
    });

    it('no ejecuta la siguiente mutación hasta que la anterior responde', () => {
      const service = setup();
      const calls: string[] = [];
      let resolveFirst: (() => void) | null = null;
      const first$ = new Observable<void>((subscriber) => {
        resolveFirst = () => {
          subscriber.next();
          subscriber.complete();
        };
      });
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => {
        calls.push('first');
        return first$;
      });
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => {
        calls.push('second');
        return of(void 0);
      });
      expect(calls).toEqual(['first']);
      resolveFirst!();
      expect(calls).toEqual(['first', 'second']);
    });

    it('continúa con las mutaciones restantes y avisa del error cuando una falla', () => {
      const service = setup();
      const calls: string[] = [];
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => throwError(() => new Error('boom')));
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => {
        calls.push('second');
        return of(void 0);
      });
      expect(mockReportApiError).toHaveBeenCalledWith('restaurantPos.errors.updateLineFailed');
      expect(calls).toEqual(['second']);
    });

    it('una mutación con applyResponse aplica su respuesta y omite el GET de refresco', () => {
      const service = setup();
      const applied: unknown[] = [];
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => of({ marker: true }), {
        applyResponse: (response) => applied.push(response),
      });
      expect(applied).toEqual([{ marker: true }]);
      expect(mockGetRestaurantServicePointOrder).not.toHaveBeenCalled();
    });

    it('aplicar la respuesta avanza la época para descartar GETs en vuelo', () => {
      const service = setup();
      const before = service.orderMutationEpoch(TABLE_ID);
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => of(void 0), { applyResponse: () => undefined });
      expect(service.orderMutationEpoch(TABLE_ID)).toBeGreaterThan(before);
    });

    it('una tanda mixta (con y sin applyResponse) sí refresca al vaciarse', () => {
      const service = setup();
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => of(void 0), { applyResponse: () => undefined });
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => of(void 0));
      expect(mockGetRestaurantServicePointOrder).toHaveBeenCalledTimes(1);
    });

    it('el refresco tras vaciar la cola no pisa mutaciones locales ocurridas durante el GET', () => {
      let resolveOrderGet: ((dto: ServicePointOrderDto) => void) | null = null;
      mockGetRestaurantServicePointOrder.mockReturnValue(
        new Observable<ServicePointOrderDto>((subscriber) => {
          resolveOrderGet = (dto) => {
            subscriber.next(dto);
            subscriber.complete();
          };
        }),
      );
      const service = setup();
      service.enqueueLineMutation(TABLE_ID, 'r-1', () => of(void 0));
      service.noteLocalOrderMutation(TABLE_ID);
      resolveOrderGet!(SERVICE_POINT_ORDER);
      expect(mockHydrateServicePointOrder).not.toHaveBeenCalled();
    });
  });
});
