import '@angular/compiler';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { RestaurantPosApiService } from './restaurant-pos-api.service';

describe('RestaurantPosApiService', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    return {
      service: TestBed.inject(RestaurantPosApiService),
      http: TestBed.inject(HttpTestingController),
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('lists restaurants from the backend', () => {
    const { service, http } = setup();
    let result: unknown;

    service.listRestaurants().subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'restaurant-mesaflow-centro',
        name: 'MesaFlow Centro',
        displayName: 'MesaFlow Centro',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
        isActive: true,
      },
    ]);

    expect(result).toEqual([
      {
        id: 'restaurant-mesaflow-centro',
        name: 'MesaFlow Centro',
        displayName: 'MesaFlow Centro',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
        isActive: true,
      },
    ]);
    http.verify();
  });

  it('loads floor data for one restaurant', () => {
    const { service, http } = setup();
    let result: unknown;

    service.getRestaurantFloors('restaurant-mesaflow-centro').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/floors');
    expect(request.request.method).toBe('GET');
    request.flush({
      restaurantId: 'restaurant-mesaflow-centro',
      tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, isActive: true }],
      floors: [
        {
          id: 'floor-main',
          name: 'Sala principal',
          rows: 12,
          columns: 16,
          elements: [{ id: 'floor-element-1', type: 'table', label: 'M1', x: 1, y: 1, width: 2, height: 2, tableId: 'table-1', shape: 'square', sortOrder: 1 }],
        },
      ],
    });

    expect(result).toEqual({
      restaurantId: 'restaurant-mesaflow-centro',
      tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, isActive: true }],
      floors: [
        {
          id: 'floor-main',
          name: 'Sala principal',
          rows: 12,
          columns: 16,
          elements: [{ id: 'floor-element-1', type: 'table', label: 'M1', x: 1, y: 1, width: 2, height: 2, tableId: 'table-1', shape: 'square', sortOrder: 1 }],
        },
      ],
    });
    http.verify();
  });

  it('loads service floor data for one restaurant', () => {
    const { service, http } = setup();
    let result: unknown;

    service.getRestaurantServiceFloor('restaurant-mesaflow-centro').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/service-floor');
    expect(request.request.method).toBe('GET');
    request.flush({
      restaurantId: 'restaurant-mesaflow-centro',
      floor: { id: 'floor-main', name: 'Sala principal', rows: 12, columns: 16 },
      elements: [{ id: 'floor-element-1', type: 'table', label: 'M1', x: 1, y: 1, width: 2, height: 2, tableId: 'table-1', shape: 'square' }],
      servicePoints: [
        {
          table: {
            id: 'table-1',
            tableNumber: 1,
            name: 'Mesa 1',
            capacity: 2,
            status: 'free',
            serviceStartedAt: null,
          },
          summary: {
            lineCount: 0,
            guestCount: 2,
            totalCents: 0,
            currency: 'EUR',
            servicePhase: { course: 'none', status: 'no_order' },
          },
        },
      ],
      totals: {
        servicePointCount: 1,
        occupiedCount: 0,
        openOrderCount: 0,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        restaurantId: 'restaurant-mesaflow-centro',
        floor: expect.objectContaining({ id: 'floor-main' }),
        elements: expect.any(Array),
        servicePoints: expect.any(Array),
        totals: expect.objectContaining({ servicePointCount: 1 }),
      }),
    );
    http.verify();
  });

  it('loads one service point detail', () => {
    const { service, http } = setup();
    let result: unknown;

    service.getRestaurantServicePoint('restaurant-mesaflow-centro', 'table-1').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-1');
    expect(request.request.method).toBe('GET');
    request.flush({
      table: {
        id: 'table-1',
        tableNumber: 1,
        name: 'Mesa 1',
        capacity: 2,
        status: 'free',
        occupiedAt: null,
        serviceStartedAt: null,
      },
      floorElement: {
        id: 'floor-element-1',
        label: 'M1',
        type: 'table',
        x: 1,
        y: 1,
        width: 2,
        height: 2,
        shape: 'square',
      },
      serviceInfo: {
        guestCount: 2,
        lineCount: 0,
        totalCents: 0,
        currency: 'EUR',
        servicePhase: { course: 'none', status: 'no_order' },
        durationMinutes: 0,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-1' }),
        serviceInfo: expect.objectContaining({ durationMinutes: 0 }),
      }),
    );
    http.verify();
  });

  it('loads the active order for one service point', () => {
    const { service, http } = setup();
    let result: unknown;

    service.getRestaurantServicePointOrder('restaurant-mesaflow-centro', 'table-1').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-1/order');
    expect(request.request.method).toBe('GET');
    request.flush({
      order: null,
      lines: [],
    });

    expect(result).toEqual({
      order: null,
      lines: [],
    });
    http.verify();
  });

  it('loads reservations for one restaurant', () => {
    const { service, http } = setup();
    let result: unknown;

    service.getRestaurantReservations('restaurant-mesaflow-centro').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/reservations');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'reservation-demo-lunch',
        customerId: 'customer-laura',
        customerNameSnapshot: 'Laura Gomez',
        customerPhoneSnapshot: '+34 600 111 222',
        partySize: 2,
        reservationAt: '2026-06-21T13:30:00.000Z',
        durationMinutes: 90,
        status: 'confirmed',
        notes: 'Mesa tranquila.',
        tableIds: ['table-1'],
        tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }],
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'reservation-demo-lunch',
        tableIds: ['table-1'],
        tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }],
      }),
    ]);
    http.verify();
  });

  it('loads reservations filtered by date when date is provided', () => {
    const { service, http } = setup();

    service.getRestaurantReservations('restaurant-mesaflow-centro', '2026-06-27').subscribe();

    const request = http.expectOne(
      '/api/v1/restaurants/restaurant-mesaflow-centro/reservations?date=2026-06-27',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('date')).toBe('2026-06-27');
    request.flush([]);
    http.verify();
  });

  it('creates one reservation for a restaurant', () => {
    const { service, http } = setup();

    service
      .createRestaurantReservation('restaurant-mesaflow-centro', {
        customerNameSnapshot: 'Marina Soler',
        customerPhoneSnapshot: '+34 600 777 888',
        partySize: 4,
        reservationAt: '2026-06-28T11:30:00.000Z',
        durationMinutes: 90,
        notes: 'Ventana',
        tableIds: ['table-1'],
      })
      .subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/reservations');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      customerNameSnapshot: 'Marina Soler',
      customerPhoneSnapshot: '+34 600 777 888',
      partySize: 4,
      reservationAt: '2026-06-28T11:30:00.000Z',
      durationMinutes: 90,
      notes: 'Ventana',
      tableIds: ['table-1'],
    });
    request.flush({});
    http.verify();
  });

  it('patches confirm for one reservation', () => {
    const { service, http } = setup();

    service.confirmRestaurantReservation('restaurant-mesaflow-centro', 'reservation-demo-group').subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/reservations/reservation-demo-group/confirm');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    request.flush({
      id: 'reservation-demo-group',
      customerId: 'customer-diego',
      customerNameSnapshot: 'Diego Martin',
      customerPhoneSnapshot: '+34 600 333 444',
      partySize: 8,
      reservationAt: '2026-06-21T21:00:00.000Z',
      durationMinutes: 120,
      status: 'confirmed',
      notes: 'Grupo de cena de empresa.',
      tableIds: ['table-3', 'table-4'],
      tables: [
        { id: 'table-3', tableNumber: 3, name: 'Mesa 3' },
        { id: 'table-4', tableNumber: 4, name: 'Mesa 4' },
      ],
    });
    http.verify();
  });

  it('patches seat for one reservation', () => {
    const { service, http } = setup();

    service.seatRestaurantReservation('restaurant-mesaflow-centro', 'reservation-demo-group').subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/reservations/reservation-demo-group/seat');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    request.flush({});
    http.verify();
  });

  it('patches no-show for one reservation', () => {
    const { service, http } = setup();

    service.markRestaurantReservationNoShow('restaurant-mesaflow-centro', 'reservation-demo-group').subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/reservations/reservation-demo-group/no-show');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    request.flush({});
    http.verify();
  });

  it('patches cancel for one reservation', () => {
    const { service, http } = setup();

    service.cancelRestaurantReservation('restaurant-mesaflow-centro', 'reservation-demo-group').subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/reservations/reservation-demo-group/cancel');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    request.flush({});
    http.verify();
  });

  it('posts occupy for one service point', () => {
    const { service, http } = setup();
    let result: unknown;

    service.occupyRestaurantServicePoint('restaurant-mesaflow-centro', 'table-1').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-1/occupy');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({
      table: {
        id: 'table-1',
        tableNumber: 1,
        name: 'Mesa 1',
        capacity: 2,
        status: 'occupied',
        occupiedAt: '2026-06-22T10:15:00.000Z',
        serviceStartedAt: '2026-06-22T10:15:00.000Z',
      },
      floorElement: {
        id: 'floor-element-1',
        label: 'M1',
        type: 'table',
        x: 1,
        y: 1,
        width: 2,
        height: 2,
        shape: 'square',
      },
      serviceInfo: {
        guestCount: 2,
        lineCount: 0,
        totalCents: 0,
        currency: 'EUR',
        servicePhase: { course: 'none', status: 'no_order' },
        durationMinutes: 0,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-1', status: 'occupied' }),
      }),
    );
    http.verify();
  });

  it('posts send to kitchen for one service point', () => {
    const { service, http } = setup();
    let result: unknown;

    service.sendRestaurantServicePointToKitchen('restaurant-mesaflow-centro', 'table-3').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-3/send-to-kitchen');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({
      table: {
        id: 'table-3',
        tableNumber: 3,
        name: 'Mesa 3',
        capacity: 6,
        status: 'waiting_kitchen',
        occupiedAt: '2026-06-22T10:15:00.000Z',
        serviceStartedAt: '2026-06-22T10:15:00.000Z',
      },
      floorElement: {
        id: 'floor-element-3',
        label: 'M3',
        type: 'table',
        x: 9,
        y: 1,
        width: 2,
        height: 2,
        shape: 'rectangle',
      },
      serviceInfo: {
        guestCount: 6,
        lineCount: 2,
        totalCents: 2940,
        currency: 'EUR',
        servicePhase: { course: 'mixed', status: 'pending' },
        durationMinutes: 10,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-3', status: 'waiting_kitchen' }),
      }),
    );
    http.verify();
  });

  it('posts mark served for one service point', () => {
    const { service, http } = setup();
    let result: unknown;

    service.markRestaurantServicePointServed('restaurant-mesaflow-centro', 'table-3').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-3/mark-served');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({
      table: {
        id: 'table-3',
        tableNumber: 3,
        name: 'Mesa 3',
        capacity: 6,
        status: 'served',
        occupiedAt: '2026-06-22T10:15:00.000Z',
        serviceStartedAt: '2026-06-22T10:15:00.000Z',
      },
      floorElement: {
        id: 'floor-element-3',
        label: 'M3',
        type: 'table',
        x: 9,
        y: 1,
        width: 2,
        height: 2,
        shape: 'rectangle',
      },
      serviceInfo: {
        guestCount: 6,
        lineCount: 2,
        totalCents: 2940,
        currency: 'EUR',
        servicePhase: { course: 'none', status: 'served' },
        durationMinutes: 22,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-3', status: 'served' }),
      }),
    );
    http.verify();
  });

  it('posts charge for one service point', () => {
    const { service, http } = setup();
    let result: unknown;

    service.chargeRestaurantServicePoint('restaurant-mesaflow-centro', 'table-2').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/table-2/charge');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({
      table: {
        id: 'table-2',
        tableNumber: 2,
        name: 'Mesa 2',
        capacity: 4,
        status: 'paid',
        occupiedAt: '2026-06-22T10:15:00.000Z',
        serviceStartedAt: '2026-06-22T10:15:00.000Z',
      },
      floorElement: {
        id: 'floor-element-2',
        label: 'M2',
        type: 'table',
        x: 5,
        y: 1,
        width: 2,
        height: 2,
        shape: 'rectangle',
      },
      serviceInfo: {
        guestCount: 4,
        lineCount: 0,
        totalCents: 0,
        currency: 'EUR',
        servicePhase: { course: 'none', status: 'no_order' },
        durationMinutes: 28,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-2', status: 'paid' }),
      }),
    );
    http.verify();
  });

  it('posts a new floor element', () => {
    const { service, http } = setup();

    service
      .createFloorElement('restaurant-mesaflow-centro', 'floor-main', {
        type: 'blocked',
        label: 'Zona temporal',
        x: 10,
        y: 9,
        width: 2,
        height: 1,
        sortOrder: 8,
        tableId: null,
        shape: null,
      })
      .subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      type: 'blocked',
      label: 'Zona temporal',
      x: 10,
      y: 9,
      width: 2,
      height: 1,
      sortOrder: 8,
      tableId: null,
      shape: null,
    });
    request.flush({ restaurantId: 'restaurant-mesaflow-centro', tables: [], floors: [] });
    http.verify();
  });

  it('patches one floor', () => {
    const { service, http } = setup();

    service
      .updateFloor('restaurant-mesaflow-centro', 'floor-main', {
        name: 'Sala principal',
        rows: 9,
        columns: 10,
      })
      .subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      name: 'Sala principal',
      rows: 9,
      columns: 10,
    });
    request.flush({ restaurantId: 'restaurant-mesaflow-centro', tables: [], floors: [] });
    http.verify();
  });

  it('puts reordered floor elements', () => {
    const { service, http } = setup();

    service
      .reorderFloorElements('restaurant-mesaflow-centro', 'floor-main', {
        elements: [{ id: 'floor-element-1', x: 2, y: 3, width: 2, height: 2, sortOrder: 1 }],
      })
      .subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/reorder');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      elements: [{ id: 'floor-element-1', x: 2, y: 3, width: 2, height: 2, sortOrder: 1 }],
    });
    request.flush({ restaurantId: 'restaurant-mesaflow-centro', tables: [], floors: [] });
    http.verify();
  });

  it('posts open order for a service point', () => {
    const { service, http } = setup();
    let result: unknown;

    service.openRestaurantOrder('restaurant-1', 'table-1', 2).subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-1/service-points/table-1/orders');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ guestCount: 2 });
    request.flush({ order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'open', currency: 'EUR', guestCount: 2, subtotalCents: 0, taxCents: 0, discountTotalCents: 0, totalCents: 0, paidCents: 0, balanceCents: 0, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:00:00.000Z', closedAt: null }, lines: [], payments: [] });

    expect(result).toEqual(expect.objectContaining({ order: expect.objectContaining({ id: 'order-1', status: 'open' }) }));
    http.verify();
  });

  it('gets a persistent order by ID', () => {
    const { service, http } = setup();
    let result: unknown;

    service.getRestaurantOrder('restaurant-1', 'order-1').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-1/orders/order-1');
    expect(request.request.method).toBe('GET');
    request.flush({ order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'open', currency: 'EUR', guestCount: 2, subtotalCents: 1200, taxCents: 208, discountTotalCents: 0, totalCents: 1200, paidCents: 0, balanceCents: 1200, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:00:00.000Z', closedAt: null }, lines: [], payments: [] });

    expect(result).toEqual(expect.objectContaining({ order: expect.objectContaining({ id: 'order-1' }) }));
    http.verify();
  });

  it('posts a line to an order', () => {
    const { service, http } = setup();
    let result: unknown;

    service.addRestaurantOrderLine('restaurant-1', 'order-1', { restaurantProductId: 'rp-1', quantity: 1, kitchenNote: null, modifiers: [], comboSlots: [], platterComponents: [] }).subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-1/orders/order-1/lines');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ restaurantProductId: 'rp-1', quantity: 1, kitchenNote: null, modifiers: [], comboSlots: [], platterComponents: [] });
    request.flush({ order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'open', currency: 'EUR', guestCount: 2, subtotalCents: 1200, taxCents: 208, discountTotalCents: 0, totalCents: 1200, paidCents: 0, balanceCents: 1200, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:00:00.000Z', closedAt: null }, lines: [{ id: 'line-1', restaurantProductId: 'rp-1', productId: 'p-1', productName: 'Burger', productType: 'simple', course: 'main', preparationRoute: 'kitchen', basePriceCents: 1200, unitPriceCents: 1200, quantity: 1, subtotalCents: 1200, taxRateName: 'IVA', taxRatePercent: 21, taxCents: 208, status: 'pending', kitchenNote: null, cancellationReason: null, cancelledAt: null, configurationSignature: 'rp-1||', modifiers: [], comboSlots: [], platterComponents: [] }], payments: [] });

    expect(result).toEqual(expect.objectContaining({ lines: expect.arrayContaining([expect.objectContaining({ id: 'line-1' })]) }));
    http.verify();
  });

  it('patches a pending order line', () => {
    const { service, http } = setup();

    service.updateRestaurantOrderLine('restaurant-1', 'order-1', 'line-1', { quantity: 3 }).subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-1/orders/order-1/lines/line-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ quantity: 3 });
    request.flush({ order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'open', currency: 'EUR', guestCount: 2, subtotalCents: 3600, taxCents: 624, discountTotalCents: 0, totalCents: 3600, paidCents: 0, balanceCents: 3600, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:00:00.000Z', closedAt: null }, lines: [], payments: [] });
    http.verify();
  });

  it('deletes a pending order line', () => {
    const { service, http } = setup();

    service.deleteRestaurantOrderLine('restaurant-1', 'order-1', 'line-1').subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-1/orders/order-1/lines/line-1');
    expect(request.request.method).toBe('DELETE');
    request.flush({ order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'open', currency: 'EUR', guestCount: 2, subtotalCents: 0, taxCents: 0, discountTotalCents: 0, totalCents: 0, paidCents: 0, balanceCents: 0, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:00:00.000Z', closedAt: null }, lines: [], payments: [] });
    http.verify();
  });

  it('posts cancel on a sent order line', () => {
    const { service, http } = setup();

    service.cancelRestaurantOrderLine('restaurant-1', 'order-1', 'line-1', 'Cliente cambió de opinión').subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-1/orders/order-1/lines/line-1/cancel');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reason: 'Cliente cambió de opinión' });
    request.flush({ order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'open', currency: 'EUR', guestCount: 2, subtotalCents: 0, taxCents: 0, discountTotalCents: 0, totalCents: 0, paidCents: 0, balanceCents: 0, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:00:00.000Z', closedAt: null }, lines: [], payments: [] });
    http.verify();
  });

  it('posts a payment on an order', () => {
    const { service, http } = setup();
    let result: unknown;

    service.registerRestaurantOrderPayment('restaurant-1', 'order-1', 1200, 'card').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-1/orders/order-1/payments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ amountCents: 1200, method: 'card' });
    request.flush({ order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'paid', currency: 'EUR', guestCount: 2, subtotalCents: 1200, taxCents: 208, discountTotalCents: 0, totalCents: 1200, paidCents: 1200, balanceCents: 0, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:01:00.000Z', closedAt: '2026-06-24T10:01:00.000Z' }, lines: [], payments: [{ id: 'pay-1', method: 'card', amountCents: 1200, status: 'completed', paidAt: '2026-06-24T10:01:00.000Z' }] });

    expect(result).toEqual(expect.objectContaining({ order: expect.objectContaining({ status: 'paid', balanceCents: 0 }) }));
    http.verify();
  });

  it('patches one floor element', () => {
    const { service, http } = setup();

    service
      .updateFloorElement('restaurant-mesaflow-centro', 'floor-main', 'floor-element-5', {
        label: 'Bar',
        x: 1,
        y: 7,
        width: 1,
        height: 6,
        shape: null,
        capacity: null,
      })
      .subscribe();

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements/floor-element-5');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      label: 'Bar',
      x: 1,
      y: 7,
      width: 1,
      height: 6,
      shape: null,
      capacity: null,
    });
    request.flush({ restaurantId: 'restaurant-mesaflow-centro', tables: [], floors: [] });
    http.verify();
  });

  it('requests a signed Cloudinary payload for product uploads', () => {
    const { service, http } = setup();
    let result: unknown;

    service
      .getProductImageUploadSignature('restaurant-mesaflow-centro', { fileName: 'burger.jpg' })
      .subscribe((value) => {
        result = value;
      });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/products/image-upload-signature');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ fileName: 'burger.jpg' });
    request.flush({
      cloudName: 'demo-cloud',
      apiKey: 'api-key',
      timestamp: 1711111111,
      signature: 'signed-payload',
      folder: 'restaurants/restaurant-mesaflow-centro/products',
    });

    expect(result).toEqual({
      cloudName: 'demo-cloud',
      apiKey: 'api-key',
      timestamp: 1711111111,
      signature: 'signed-payload',
      folder: 'restaurants/restaurant-mesaflow-centro/products',
    });
    http.verify();
  });
});
