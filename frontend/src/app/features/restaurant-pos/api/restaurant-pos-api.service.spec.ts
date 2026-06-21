import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

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
});
