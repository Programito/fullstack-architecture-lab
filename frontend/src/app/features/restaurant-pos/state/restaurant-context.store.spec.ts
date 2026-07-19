import { TestBed } from '@angular/core/testing';
import { type Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../../shared/utils/storage/key-value-storage';
import { IdentitySessionStore } from '../../identity/identity-session.store';
import type { RestaurantSummaryDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantContextStore } from './restaurant-context.store';

describe('RestaurantContextStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: KEY_VALUE_STORAGE, useValue: new MemoryKeyValueStorage() }],
    });
  });

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
                  organizationId: 'org-demo',
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

  it('does not restart a completed context load unless the caller explicitly forces it', () => {
    const listRestaurants = vi.fn(() =>
      of([
        {
          id: 'restaurant-mesaflow-centro',
          organizationId: 'org-demo',
          name: 'MesaFlow Centro',
          displayName: 'MesaFlow Centro',
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          isActive: true,
        },
      ]),
    );
    TestBed.configureTestingModule({
      providers: [
        RestaurantContextStore,
        { provide: RestaurantPosApiService, useValue: { listRestaurants } },
      ],
    });
    const store = TestBed.inject(RestaurantContextStore);
    const load = store.load.bind(store) as (options?: { force?: boolean }) => void;

    load();
    load();

    expect(listRestaurants).toHaveBeenCalledTimes(1);

    load({ force: true });

    expect(listRestaurants).toHaveBeenCalledTimes(2);
  });

  it('clears the completed restaurant context and reloads it for a different user', () => {
    const listRestaurants = vi
      .fn<() => Observable<RestaurantSummaryDto[]>>()
      .mockReturnValueOnce(of([restaurant('restaurant-a', 'Centro')]))
      .mockReturnValueOnce(of([restaurant('restaurant-b', 'Norte')]));
    TestBed.configureTestingModule({
      providers: [
        RestaurantContextStore,
        { provide: RestaurantPosApiService, useValue: { listRestaurants } },
      ],
    });
    const identity = TestBed.inject(IdentitySessionStore);
    identity.setSession(sessionFor('user-a'));
    const store = TestBed.inject(RestaurantContextStore);

    store.load();
    expect(store.activeRestaurant()?.id).toBe('restaurant-a');

    identity.setSession(sessionFor('user-b'));
    TestBed.flushEffects();
    expect(store.restaurants()).toEqual([]);

    store.load();

    expect(listRestaurants).toHaveBeenCalledTimes(2);
    expect(store.activeRestaurant()?.id).toBe('restaurant-b');
  });

  it('ignores an in-flight restaurant response from a previous user', () => {
    const firstResponse = new Subject<RestaurantSummaryDto[]>();
    const secondResponse = new Subject<RestaurantSummaryDto[]>();
    const listRestaurants = vi
      .fn<() => Subject<RestaurantSummaryDto[]>>()
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(secondResponse);
    TestBed.configureTestingModule({
      providers: [
        RestaurantContextStore,
        { provide: RestaurantPosApiService, useValue: { listRestaurants } },
      ],
    });
    const identity = TestBed.inject(IdentitySessionStore);
    identity.setSession(sessionFor('user-a'));
    const store = TestBed.inject(RestaurantContextStore);
    store.load();

    identity.setSession(sessionFor('user-b'));
    TestBed.flushEffects();
    store.load();
    firstResponse.next([restaurant('restaurant-a', 'Centro')]);
    firstResponse.complete();

    expect(store.restaurants()).toEqual([]);
    expect(store.isLoading()).toBe(true);

    secondResponse.next([restaurant('restaurant-b', 'Norte')]);
    secondResponse.complete();

    expect(store.activeRestaurant()?.id).toBe('restaurant-b');
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
                { id: 'restaurant-1', organizationId: 'org-demo', name: 'Centro', displayName: 'Centro', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
                { id: 'restaurant-2', organizationId: 'org-demo', name: 'Norte', displayName: 'Norte', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
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
                { id: 'restaurant-1', organizationId: 'org-demo', name: 'Centro', displayName: 'Centro', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
                { id: 'restaurant-2', organizationId: 'org-demo', name: 'Norte', displayName: 'Norte', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
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

  it('stores a load error when the request fails', async () => {
    vi.useFakeTimers();
    try {
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

      // Con los reintentos automáticos (3 × 1500 ms por si la base de datos está
      // despertando), el error no aparece de inmediato…
      expect(store.isLoading()).toBe(true);
      expect(store.loadError()).toBeNull();

      // …sino al agotar los reintentos.
      await vi.advanceTimersByTimeAsync(4500);

      expect(store.activeRestaurant()).toBeNull();
      expect(store.isLoading()).toBe(false);
      expect(store.loadError()).toBe('restaurantPos.selector.loadError');
      expect(store.hasNoRestaurants()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

function restaurant(id: string, name: string): RestaurantSummaryDto {
  return {
    id,
    organizationId: 'org-demo',
    name,
    displayName: name,
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    isActive: true,
  };
}

function sessionFor(userId: string) {
  return {
    userId,
    roles: [],
    permissions: [],
    accessToken: 'token',
    scopes: { organizations: [], restaurants: [] },
    accountType: 'regular' as const,
  };
}
