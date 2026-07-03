import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { EMPTY } from 'rxjs';

import { provideI18nTesting } from '../../shared/i18n/i18n-testing';
import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../shared/utils/storage/key-value-storage';
import { routes } from '../../app.routes';
import { RestaurantContextStore } from './state/restaurant-context.store';
import { RestaurantPosApiService } from './api/restaurant-pos-api.service';

const API_MOCK = new Proxy({}, { get: () => () => EMPTY }) as RestaurantPosApiService;

@Component({
  selector: 'app-test-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class TestHostComponent {}

const makeRestaurantA = () => ({ id: 'r-1', organizationId: 'org-demo', name: 'MesaFlow Centro', displayName: null, timezone: 'Europe/Madrid', currency: 'EUR', isActive: true });

describe('restaurant POS route permissions', () => {
  const renderApp = async (
    permissions: string[],
    initialUrl: string,
    opts: { scopes?: { organizations?: string[]; restaurants?: string[] }; restaurantId?: string | null } = {},
  ) => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem('locale', 'es');
    storage.setItem(
      'identity.session',
      JSON.stringify({
        userId: 'user-1',
        roles: ['test-role'],
        permissions,
        accessToken: 'token',
        scopes: opts.scopes ?? { organizations: [], restaurants: [] },
      }),
    );
    const i18n = provideI18nTesting();

    const restaurant = makeRestaurantA();
    const activeId = opts.restaurantId !== undefined ? opts.restaurantId : restaurant.id;
    const mockContextStore = {
      load: () => {},
      setActiveRestaurantId: () => {},
      isLoading: signal(false),
      multipleRestaurants: signal(false),
      activeRestaurant: signal(activeId ? restaurant : null),
      restaurants: signal([restaurant]),
    };

    const view = await render(TestHostComponent, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: RestaurantContextStore, useValue: mockContextStore },
        { provide: RestaurantPosApiService, useValue: API_MOCK },
        provideRouter(routes),
      ],
    });

    await TestBed.inject(Router).navigateByUrl(initialUrl);
    view.fixture.detectChanges();
  };

  it('redirects to the first allowed section when the route permission is missing', async () => {
    await renderApp(['layout'], '/restaurant-pos/service');

    expect(TestBed.inject(Router).url).toBe('/restaurant-pos/layout');
  });

  it('redirects to the access page when the user has no allowed modules', async () => {
    await renderApp([], '/restaurant-pos/menu');

    expect(TestBed.inject(Router).url).toBe('/restaurant-pos/access');
    expect(screen.getByRole('heading', { name: 'Sin módulos disponibles' })).toBeTruthy();
  });
});

describe('restaurantScopeGuard', () => {
  const renderApp = async (
    permissions: string[],
    initialUrl: string,
    opts: { scopes?: { organizations?: string[]; restaurants?: string[] }; restaurantId?: string | null } = {},
  ) => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem('locale', 'es');
    storage.setItem(
      'identity.session',
      JSON.stringify({
        userId: 'user-1',
        roles: ['test-role'],
        permissions,
        accessToken: 'token',
        scopes: opts.scopes ?? { organizations: [], restaurants: [] },
      }),
    );
    const i18n = provideI18nTesting();

    const restaurant = makeRestaurantA();
    const activeId = opts.restaurantId !== undefined ? opts.restaurantId : restaurant.id;
    const mockContextStore = {
      load: () => {},
      setActiveRestaurantId: () => {},
      isLoading: signal(false),
      multipleRestaurants: signal(false),
      activeRestaurant: signal(activeId ? restaurant : null),
      restaurants: signal([restaurant]),
    };

    const view = await render(TestHostComponent, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: RestaurantContextStore, useValue: mockContextStore },
        { provide: RestaurantPosApiService, useValue: API_MOCK },
        provideRouter(routes),
      ],
    });

    await TestBed.inject(Router).navigateByUrl(initialUrl);
    view.fixture.detectChanges();
    return TestBed.inject(Router);
  };

  it('permite el acceso cuando el restaurante activo está en scopes.restaurants', async () => {
    const router = await renderApp(['service'], '/restaurant-pos/service', {
      scopes: { organizations: [], restaurants: ['r-1'] },
    });
    expect(router.url).toBe('/restaurant-pos/service');
  });

  it('permite el acceso cuando scopes.restaurants está vacío (sin restricción de scope)', async () => {
    const router = await renderApp(['service'], '/restaurant-pos/service', {
      scopes: { organizations: [], restaurants: [] },
    });
    expect(router.url).toBe('/restaurant-pos/service');
  });

  it('permite el acceso cuando el usuario tiene scope de organización', async () => {
    const router = await renderApp(['service'], '/restaurant-pos/service', {
      scopes: { organizations: ['org-1'], restaurants: [] },
    });
    expect(router.url).toBe('/restaurant-pos/service');
  });

  it('redirige a access cuando el restaurante activo no está en scopes.restaurants', async () => {
    const router = await renderApp(['service'], '/restaurant-pos/service', {
      scopes: { organizations: [], restaurants: ['r-otro'] },
    });
    expect(router.url).toBe('/restaurant-pos/access');
  });

  it('permite el acceso cuando no hay restaurante activo (el selector lo gestiona)', async () => {
    const router = await renderApp(['service'], '/restaurant-pos/service', {
      scopes: { organizations: [], restaurants: ['r-otro'] },
      restaurantId: null,
    });
    expect(router.url).toBe('/restaurant-pos/service');
  });
});
