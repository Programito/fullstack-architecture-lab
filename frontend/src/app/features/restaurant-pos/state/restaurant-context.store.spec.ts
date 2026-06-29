import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantContextStore } from './restaurant-context.store';

describe('RestaurantContextStore', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('selects the only available restaurant automatically', () => {
    TestBed.configureTestingModule({
      providers: [
        RestaurantContextStore,
        {
          provide: RestaurantPosApiService,
          useValue: {
            listRestaurants: () =>
              of([
                {
                  id: 'restaurant-mesaflow-centro',
                  name: 'MesaFlow Centro',
                  displayName: 'MesaFlow Centro',
                  timezone: 'Europe/Madrid',
                  currency: 'EUR',
                  isActive: true,
                },
              ]),
          },
        },
      ],
    });

    const store = TestBed.inject(RestaurantContextStore);
    store.load();

    expect(store.activeRestaurant()?.id).toBe('restaurant-mesaflow-centro');
    expect(store.multipleRestaurants()).toBe(false);
    expect(store.isLoading()).toBe(false);
    expect(store.hasNoRestaurants()).toBe(false);
  });

  it('keeps active restaurant null when multiple restaurants are returned', () => {
    TestBed.configureTestingModule({
      providers: [
        RestaurantContextStore,
        {
          provide: RestaurantPosApiService,
          useValue: {
            listRestaurants: () =>
              of([
                { id: 'restaurant-1', name: 'Centro', displayName: 'Centro', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
                { id: 'restaurant-2', name: 'Norte', displayName: 'Norte', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
              ]),
          },
        },
      ],
    });

    const store = TestBed.inject(RestaurantContextStore);
    store.load();

    expect(store.activeRestaurant()).toBeNull();
    expect(store.multipleRestaurants()).toBe(true);
    expect(store.hasNoRestaurants()).toBe(false);
  });

  it('exposes an empty state when no restaurants are returned', () => {
    TestBed.configureTestingModule({
      providers: [
        RestaurantContextStore,
        {
          provide: RestaurantPosApiService,
          useValue: {
            listRestaurants: () => of([]),
          },
        },
      ],
    });

    const store = TestBed.inject(RestaurantContextStore);
    store.load();

    expect(store.activeRestaurant()).toBeNull();
    expect(store.multipleRestaurants()).toBe(false);
    expect(store.hasNoRestaurants()).toBe(true);
    expect(store.loadError()).toBeNull();
  });

  it('allows manually setting the active restaurant when multiple are available', () => {
    TestBed.configureTestingModule({
      providers: [
        RestaurantContextStore,
        {
          provide: RestaurantPosApiService,
          useValue: {
            listRestaurants: () =>
              of([
                { id: 'restaurant-1', name: 'Centro', displayName: 'Centro', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
                { id: 'restaurant-2', name: 'Norte', displayName: 'Norte', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
              ]),
          },
        },
      ],
    });

    const store = TestBed.inject(RestaurantContextStore);
    store.load();

    expect(store.activeRestaurant()).toBeNull();

    store.setActiveRestaurantId('restaurant-2');

    expect(store.activeRestaurant()?.id).toBe('restaurant-2');
    expect(store.activeRestaurant()?.name).toBe('Norte');
  });

  it('stores a load error when the request fails', () => {
    TestBed.configureTestingModule({
      providers: [
        RestaurantContextStore,
        {
          provide: RestaurantPosApiService,
          useValue: {
            listRestaurants: () => throwError(() => new Error('boom')),
          },
        },
      ],
    });

    const store = TestBed.inject(RestaurantContextStore);
    store.load();

    expect(store.activeRestaurant()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(store.loadError()).toBe('restaurantPos.layout.errors.loadRestaurants');
    expect(store.hasNoRestaurants()).toBe(false);
  });
});
