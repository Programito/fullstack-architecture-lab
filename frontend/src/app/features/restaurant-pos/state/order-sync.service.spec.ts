import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import type { RestaurantSummaryDto, ServiceFloorDto, ServicePointOrderDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RealtimeService, type OrderInvalidatedEvent } from '../../../core/realtime/realtime.service';
import { RestaurantContextStore } from './restaurant-context.store';
import { RestaurantPosStore } from './restaurant-pos.store';
import { ORDER_SYNC_POLL_INTERVAL_MS, OrderSyncService } from './order-sync.service';

const RESTAURANT: RestaurantSummaryDto = {
  id: 'r-1',
  organizationId: 'org-demo',
  name: 'MesaFlow',
  displayName: null,
  timezone: 'Europe/Madrid',
  currency: 'EUR',
  isActive: true,
};

const FLOOR_WITH_LINES: ServiceFloorDto = {
  restaurantId: 'r-1',
  floor: { id: 'floor-1', name: 'Sala', rows: 4, columns: 4 },
  elements: [],
  servicePoints: [
    {
      table: { id: 'table-1', tableNumber: 1, name: null, capacity: 4, status: 'occupied', serviceStartedAt: null },
      summary: { lineCount: 2, guestCount: 2, totalCents: 2000, currency: 'EUR', servicePhase: { course: 'mains', status: 'in_progress' } },
    },
    {
      table: { id: 'table-2', tableNumber: 2, name: null, capacity: 2, status: 'free', serviceStartedAt: null },
      summary: { lineCount: 0, guestCount: 0, totalCents: 0, currency: 'EUR', servicePhase: { course: 'none', status: 'no_order' } },
    },
  ],
  totals: { servicePointCount: 2, occupiedCount: 1, openOrderCount: 1 },
};

const EMPTY_FLOOR: ServiceFloorDto = {
  restaurantId: 'r-1',
  floor: { id: 'floor-1', name: 'Sala', rows: 4, columns: 4 },
  elements: [],
  servicePoints: [],
  totals: { servicePointCount: 0, occupiedCount: 0, openOrderCount: 0 },
};

const ORDER: ServicePointOrderDto = {
  order: {
    id: 'order-1',
    tableId: 'table-1',
    status: 'open',
    openedAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    subtotalCents: 2000,
    taxCents: 200,
    totalCents: 2200,
    currency: 'EUR',
  },
  lines: [],
};

describe('OrderSyncService', () => {
  let activeRestaurant: ReturnType<typeof signal<RestaurantSummaryDto | null>>;
  let mockLoad: ReturnType<typeof vi.fn>;
  let mockHydrateServiceFloor: ReturnType<typeof vi.fn>;
  let mockHydrateServicePointOrder: ReturnType<typeof vi.fn>;
  let mockGetServiceFloor: ReturnType<typeof vi.fn>;
  let mockGetServicePointOrder: ReturnType<typeof vi.fn>;
  let invalidated$: Subject<OrderInvalidatedEvent>;

  beforeEach(() => {
    vi.useFakeTimers();
    activeRestaurant = signal<RestaurantSummaryDto | null>(null);
    mockLoad = vi.fn();
    mockHydrateServiceFloor = vi.fn();
    mockHydrateServicePointOrder = vi.fn();
    mockGetServiceFloor = vi.fn().mockReturnValue(of(FLOOR_WITH_LINES));
    mockGetServicePointOrder = vi.fn().mockReturnValue(of(ORDER));
    invalidated$ = new Subject<OrderInvalidatedEvent>();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        OrderSyncService,
        {
          provide: RestaurantContextStore,
          useValue: { activeRestaurant: activeRestaurant.asReadonly(), load: mockLoad },
        },
        {
          provide: RestaurantPosStore,
          useValue: { hydrateServiceFloor: mockHydrateServiceFloor, hydrateServicePointOrder: mockHydrateServicePointOrder },
        },
        {
          provide: RestaurantPosApiService,
          useValue: { getRestaurantServiceFloor: mockGetServiceFloor, getRestaurantServicePointOrder: mockGetServicePointOrder },
        },
        {
          provide: RealtimeService,
          useValue: { invalidated$: invalidated$.asObservable() },
        },
      ],
    });
    return TestBed.inject(OrderSyncService);
  }

  it('no llama a la API de planta cuando no hay restaurante activo', async () => {
    setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockGetServiceFloor).not.toHaveBeenCalled();
  });

  it('obtiene la planta del restaurante y la hidrata en el store cuando hay restaurante activo', async () => {
    setup();
    activeRestaurant.set(RESTAURANT);
    TestBed.flushEffects();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockGetServiceFloor).toHaveBeenCalledWith('r-1');
    expect(mockHydrateServiceFloor).toHaveBeenCalledOnce();
  });

  it('solo obtiene el pedido de los puntos de servicio que tienen líneas', async () => {
    setup();
    activeRestaurant.set(RESTAURANT);
    TestBed.flushEffects();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockGetServicePointOrder).toHaveBeenCalledWith('r-1', 'table-1');
    expect(mockGetServicePointOrder).not.toHaveBeenCalledWith('r-1', 'table-2');
  });

  it('hidrata el pedido en el store para cada punto de servicio con líneas', async () => {
    setup();
    activeRestaurant.set(RESTAURANT);
    TestBed.flushEffects();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockHydrateServicePointOrder).toHaveBeenCalledWith('table-1', expect.anything());
  });

  it('no llama a la API de pedidos cuando la planta no tiene puntos con líneas', async () => {
    mockGetServiceFloor.mockReturnValue(of(EMPTY_FLOOR));
    setup();
    activeRestaurant.set(RESTAURANT);
    TestBed.flushEffects();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockGetServicePointOrder).not.toHaveBeenCalled();
  });

  it('vuelve a obtener la planta tras el intervalo de sondeo', async () => {
    setup();
    activeRestaurant.set(RESTAURANT);
    TestBed.flushEffects();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockGetServiceFloor).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(ORDER_SYNC_POLL_INTERVAL_MS);
    expect(mockGetServiceFloor).toHaveBeenCalledTimes(2);
  });

  it('dispara un fetch inmediato cuando llega un evento de invalidación por socket', async () => {
    setup();
    activeRestaurant.set(RESTAURANT);
    TestBed.flushEffects();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockGetServiceFloor).toHaveBeenCalledTimes(1);

    invalidated$.next({ restaurantId: 'r-1', tableId: 'table-1', orderId: 'order-1', reason: 'order.line.created' });
    await vi.advanceTimersByTimeAsync(300);
    expect(mockGetServiceFloor).toHaveBeenCalledTimes(2);
  });

  it('agrupa varios eventos de invalidación seguidos en un solo fetch extra (debounce)', async () => {
    setup();
    activeRestaurant.set(RESTAURANT);
    TestBed.flushEffects();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockGetServiceFloor).toHaveBeenCalledTimes(1);

    invalidated$.next({ restaurantId: 'r-1', tableId: 'table-1', orderId: 'order-1', reason: 'order.line.created' });
    await vi.advanceTimersByTimeAsync(100);
    invalidated$.next({ restaurantId: 'r-1', tableId: 'table-1', orderId: 'order-1', reason: 'order.line.updated' });
    await vi.advanceTimersByTimeAsync(300);

    expect(mockGetServiceFloor).toHaveBeenCalledTimes(2);
  });

  it('ignora eventos de invalidación de un restaurante distinto al activo', async () => {
    setup();
    activeRestaurant.set(RESTAURANT);
    TestBed.flushEffects();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockGetServiceFloor).toHaveBeenCalledTimes(1);

    invalidated$.next({ restaurantId: 'r-2', tableId: 'table-1', orderId: 'order-1', reason: 'order.line.created' });
    await vi.advanceTimersByTimeAsync(300);
    expect(mockGetServiceFloor).toHaveBeenCalledTimes(1);
  });

  it('se comporta igual que hoy cuando el socket nunca emite (desactivado o caído)', async () => {
    setup();
    activeRestaurant.set(RESTAURANT);
    TestBed.flushEffects();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockGetServiceFloor).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(ORDER_SYNC_POLL_INTERVAL_MS);
    expect(mockGetServiceFloor).toHaveBeenCalledTimes(2);
  });
});
