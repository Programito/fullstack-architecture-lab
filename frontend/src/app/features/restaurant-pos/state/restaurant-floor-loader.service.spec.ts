import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { vi } from 'vitest';

import { provideI18nTesting } from '../../../shared/i18n/i18n-testing';
import { IdentitySessionStore } from '../../identity/identity-session.store';
import type { ServiceFloorDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantContextStore } from './restaurant-context.store';
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
  let identitySession: ReturnType<typeof signal<{ userId: string | null }>>;
  let activeRestaurant: ReturnType<typeof signal<{ id: string } | null>>;

  beforeEach(() => {
    response = new Subject<ServiceFloorDto>();
    getRestaurantServiceFloor = vi.fn(() => response.asObservable());
    identitySession = signal({ userId: 'user-1' });
    activeRestaurant = signal<{ id: string } | null>({ id: 'restaurant-1' });
    const i18n = provideI18nTesting('en');

    TestBed.configureTestingModule({
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        RestaurantFloorLoader,
        { provide: IdentitySessionStore, useValue: { session: identitySession.asReadonly() } },
        { provide: RestaurantContextStore, useValue: { activeRestaurant: activeRestaurant.asReadonly() } },
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

  function refreshFloor(restaurantId: string): Observable<ServiceFloorDto> {
    const refresh = (loader as unknown as {
      refresh?: (id: string) => Observable<ServiceFloorDto>;
    }).refresh;
    expect(refresh).toBeTypeOf('function');
    return refresh!.call(loader, restaurantId);
  }

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

  it('clears the cached floor and refetches the same restaurant for a different user', () => {
    loader.load('restaurant-1');
    response.next(serviceFloorFixture);
    response.complete();
    expect(store.activeFloorId()).toBe('floor-main');

    response = new Subject<ServiceFloorDto>();
    identitySession.set({ userId: 'user-2' });
    TestBed.flushEffects();

    expect(store.activeFloorId()).toBeNull();
    expect(store.floorLoadStatus()).toBe('loading');

    loader.load('restaurant-1');
    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(2);
    response.next(serviceFloorFixture);
    response.complete();

    expect(store.activeFloorId()).toBe('floor-main');
  });

  it('rejects a late refresh outside the active restaurant without clearing the current floor', () => {
    loader.load('restaurant-1');
    response.next(serviceFloorFixture);
    response.complete();

    activeRestaurant.set({ id: 'restaurant-b' });
    refreshFloor('restaurant-a').subscribe();

    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(1);
    expect(store.floorLoadStatus()).toBe('loaded');
    expect(store.activeFloorId()).toBe('floor-main');
  });

  it('waits for one trailing snapshot when a refresh joins the initial request', () => {
    const trailingResponse = new Subject<ServiceFloorDto>();
    const refreshedSnapshots: ServiceFloorDto[] = [];
    getRestaurantServiceFloor
      .mockReturnValueOnce(response.asObservable())
      .mockReturnValueOnce(trailingResponse.asObservable());

    loader.load('restaurant-1');
    refreshFloor('restaurant-1').subscribe((snapshot) => refreshedSnapshots.push(snapshot));

    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(1);

    response.next(serviceFloorFixture);
    response.complete();

    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(2);
    expect(refreshedSnapshots).toEqual([]);
    expect(store.floorLoadStatus()).toBe('loading');
    expect(store.activeFloorId()).toBeNull();

    trailingResponse.next(serviceFloorFixture);
    trailingResponse.complete();

    expect(refreshedSnapshots).toEqual([serviceFloorFixture]);
  });

  it('reports an error when the trailing replacement for an initial load fails', () => {
    const trailingResponse = new Subject<ServiceFloorDto>();
    getRestaurantServiceFloor
      .mockReturnValueOnce(response.asObservable())
      .mockReturnValueOnce(trailingResponse.asObservable());

    loader.load('restaurant-1');
    refreshFloor('restaurant-1').subscribe();
    response.next(serviceFloorFixture);
    response.complete();
    trailingResponse.error(new Error('trailing request failed'));

    expect(store.floorLoadStatus()).toBe('error');
    expect(store.activeFloorId()).toBeNull();
  });

  it('coalesces refreshes received during a request into one trailing request', () => {
    const trailingResponse = new Subject<ServiceFloorDto>();
    const firstRefreshSnapshots: ServiceFloorDto[] = [];
    const secondRefreshSnapshots: ServiceFloorDto[] = [];
    getRestaurantServiceFloor
      .mockReturnValueOnce(response.asObservable())
      .mockReturnValueOnce(trailingResponse.asObservable());

    loader.load('restaurant-1');
    refreshFloor('restaurant-1').subscribe((snapshot) => firstRefreshSnapshots.push(snapshot));
    refreshFloor('restaurant-1').subscribe((snapshot) => secondRefreshSnapshots.push(snapshot));

    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(1);

    response.next(serviceFloorFixture);
    response.complete();

    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(2);

    const trailingFixture = {
      ...serviceFloorFixture,
      floor: { ...serviceFloorFixture.floor, name: 'Sala actualizada' },
    };
    trailingResponse.next(trailingFixture);
    trailingResponse.complete();

    expect(firstRefreshSnapshots).toEqual([trailingFixture]);
    expect(secondRefreshSnapshots).toEqual([trailingFixture]);
    expect(store.activeFloorName()).toBe('Sala actualizada');
  });

  it('cancels a superseded restaurant request before starting the next one', () => {
    const firstRequestTeardown = vi.fn();
    const firstRestaurantResponse = new Observable<ServiceFloorDto>(() => firstRequestTeardown);
    const secondRestaurantResponse = new Subject<ServiceFloorDto>();
    getRestaurantServiceFloor
      .mockReturnValueOnce(firstRestaurantResponse)
      .mockReturnValueOnce(secondRestaurantResponse.asObservable());

    activeRestaurant.set({ id: 'restaurant-a' });
    loader.load('restaurant-a');
    activeRestaurant.set({ id: 'restaurant-b' });
    loader.load('restaurant-b');

    expect(firstRequestTeardown).toHaveBeenCalledTimes(1);
    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(2);
  });

  it('keeps the loaded floor visible while a background refresh is in flight', () => {
    const refreshResponse = new Subject<ServiceFloorDto>();
    getRestaurantServiceFloor
      .mockReturnValueOnce(response.asObservable())
      .mockReturnValueOnce(refreshResponse.asObservable());

    loader.load('restaurant-1');
    response.next(serviceFloorFixture);
    response.complete();

    refreshFloor('restaurant-1').subscribe();

    expect(store.floorLoadStatus()).toBe('loaded');
    expect(store.activeFloorId()).toBe('floor-main');
    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(2);
  });

  it('records an error and retries with a fresh request', () => {
    loader.load('restaurant-1');
    response.error(new Error('network'));
    expect(store.floorLoadStatus()).toBe('error');

    loader.load('restaurant-1');
    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(1);

    loader.retry('restaurant-1');
    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(2);
  });

  it('does not let a failed background refresh replace a loaded snapshot with an error', () => {
    const refreshResponse = new Subject<ServiceFloorDto>();
    getRestaurantServiceFloor
      .mockReturnValueOnce(response.asObservable())
      .mockReturnValueOnce(refreshResponse.asObservable());

    loader.load('restaurant-1');
    response.next(serviceFloorFixture);
    response.complete();

    refreshFloor('restaurant-1').subscribe();
    refreshResponse.error(new Error('network'));

    expect(store.floorLoadStatus()).toBe('loaded');
    expect(store.activeFloorId()).toBe('floor-main');
  });

  it('accepts an empty backend snapshot during refresh and removes the previous floor', () => {
    const refreshResponse = new Subject<ServiceFloorDto>();
    getRestaurantServiceFloor
      .mockReturnValueOnce(response.asObservable())
      .mockReturnValueOnce(refreshResponse.asObservable());

    loader.load('restaurant-1');
    response.next(serviceFloorFixture);
    response.complete();

    refreshFloor('restaurant-1').subscribe();
    refreshResponse.error(new HttpErrorResponse({ status: 404 }));

    expect(store.floorLoadStatus()).toBe('loaded');
    expect(store.activeFloorId()).toBeNull();
    expect(store.floorElements()).toEqual([]);
    expect(store.restaurantTables()).toEqual([]);
  });

  it('ignores a stale response from a previous restaurant', () => {
    const restaurantAResponse = new Subject<ServiceFloorDto>();
    const restaurantBResponse = new Subject<ServiceFloorDto>();
    getRestaurantServiceFloor
      .mockReturnValueOnce(restaurantAResponse.asObservable())
      .mockReturnValueOnce(restaurantBResponse.asObservable());

    activeRestaurant.set({ id: 'restaurant-a' });
    loader.load('restaurant-a');
    refreshFloor('restaurant-a').subscribe();
    activeRestaurant.set({ id: 'restaurant-b' });
    loader.load('restaurant-b');

    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(2);

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
