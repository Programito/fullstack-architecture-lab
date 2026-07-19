import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { provideI18nTesting } from '../../../shared/i18n/i18n-testing';
import type { ServiceFloorDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantPosStore } from './restaurant-pos.store';
import { RestaurantFloorLoader } from './restaurant-floor-loader.service';

const serviceFloorFixture: ServiceFloorDto = {
  restaurantId: 'restaurant-1',
  floor: { id: 'floor-main', name: 'Main room', rows: 4, columns: 4 },
  elements: [
    {
      id: 'element-1',
      type: 'table',
      label: 'Table 1',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      shape: 'square',
      tableId: 'table-1',
    },
  ],
  servicePoints: [
    {
      table: {
        id: 'table-1',
        tableNumber: 1,
        name: null,
        capacity: 4,
        status: 'free',
        serviceStartedAt: null,
      },
      summary: {
        lineCount: 0,
        guestCount: 0,
        totalCents: 0,
        currency: 'EUR',
        servicePhase: { course: 'none', status: 'no_order' },
      },
    },
  ],
  totals: { servicePointCount: 1, occupiedCount: 0, openOrderCount: 0 },
};

describe('RestaurantFloorLoader', () => {
  let loader: RestaurantFloorLoader;
  let store: RestaurantPosStore;
  let response: Subject<ServiceFloorDto>;
  let getRestaurantServiceFloor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    response = new Subject<ServiceFloorDto>();
    getRestaurantServiceFloor = vi.fn(() => response.asObservable());
    const i18n = provideI18nTesting('en');

    TestBed.configureTestingModule({
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        RestaurantFloorLoader,
        {
          provide: RestaurantPosApiService,
          useValue: { getRestaurantServiceFloor },
        },
      ],
    });

    loader = TestBed.inject(RestaurantFloorLoader);
    store = TestBed.inject(RestaurantPosStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads and maps the active restaurant service floor', () => {
    loader.load('restaurant-1');
    expect(store.floorLoadStatus()).toBe('loading');

    response.next(serviceFloorFixture);
    response.complete();

    expect(store.floorLoadStatus()).toBe('loaded');
    expect(store.activeFloorId()).toBe('floor-main');
    expect(store.floorElements()[0]?.id).toBe('element-1');
  });

  it('deduplicates an in-flight and completed load for the same restaurant', () => {
    loader.load('restaurant-1');
    loader.load('restaurant-1');
    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(1);

    response.next(serviceFloorFixture);
    response.complete();
    loader.load('restaurant-1');

    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(1);
  });

  it('records an error and retries with a fresh request', () => {
    loader.load('restaurant-1');
    response.error(new Error('network'));
    expect(store.floorLoadStatus()).toBe('error');

    loader.retry('restaurant-1');
    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale response from a previous restaurant', () => {
    const restaurantAResponse = new Subject<ServiceFloorDto>();
    const restaurantBResponse = new Subject<ServiceFloorDto>();
    getRestaurantServiceFloor
      .mockReturnValueOnce(restaurantAResponse.asObservable())
      .mockReturnValueOnce(restaurantBResponse.asObservable());

    loader.load('restaurant-a');
    loader.load('restaurant-b');

    restaurantBResponse.next({ ...serviceFloorFixture, restaurantId: 'restaurant-b', floor: { ...serviceFloorFixture.floor, id: 'floor-b' } });
    restaurantAResponse.next({ ...serviceFloorFixture, restaurantId: 'restaurant-a', floor: { ...serviceFloorFixture.floor, id: 'floor-a' } });

    expect(store.activeFloorId()).toBe('floor-b');
  });

  it('completes an empty loaded floor when the restaurant has no configured floor', () => {
    loader.load('restaurant-1');
    response.error(new HttpErrorResponse({ status: 404 }));

    expect(store.floorLoadStatus()).toBe('loaded');
    expect(store.activeFloorId()).toBeNull();
    expect(store.floorElements()).toEqual([]);
    expect(store.restaurantTables()).toEqual([]);
  });
});
