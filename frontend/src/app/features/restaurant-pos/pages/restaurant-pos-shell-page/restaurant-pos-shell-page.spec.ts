import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';
import { Router, provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { vi } from 'vitest';

import { MemoryKeyValueStorage, KEY_VALUE_STORAGE } from '../../../../shared/utils/storage/key-value-storage';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { IdentitySessionStore } from '../../../identity/identity-session.store';
import { RESTAURANT_POS_SECTIONS } from '../../restaurant-pos.routes';
import { RestaurantPosShellPage } from './restaurant-pos-shell-page';
import { IdentityApiService } from '../../../identity/api/identity-api.service';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';

const API_MOCK = new Proxy({}, { get: () => () => EMPTY }) as RestaurantPosApiService;

const RESTAURANT_A = { id: 'r-a', name: 'MesaFlow Centro', displayName: null, timezone: 'Europe/Madrid', currency: 'EUR', isActive: true };
const RESTAURANT_B = { id: 'r-b', name: 'MesaFlow Norte', displayName: null, timezone: 'Europe/Madrid', currency: 'EUR', isActive: true };

function makeContextMock(opts: {
  restaurants?: typeof RESTAURANT_A[];
  activeRestaurant?: typeof RESTAURANT_A | null;
  isLoading?: boolean;
} = {}) {
  const restaurants = opts.restaurants ?? [RESTAURANT_A];
  const activeRestaurant = opts.activeRestaurant !== undefined ? opts.activeRestaurant : RESTAURANT_A;
  const isLoading = opts.isLoading ?? false;
  return {
    load: vi.fn(),
    setActiveRestaurantId: vi.fn(),
    isLoading: signal(isLoading),
    multipleRestaurants: signal(restaurants.length > 1),
    activeRestaurant: signal(activeRestaurant),
    restaurants: signal(restaurants),
  };
}

@Component({
  template: '',
})
class TestRoutePage {}

describe('RestaurantPosShellPage', () => {
  const renderPage = async (
    permissions: string[],
    initialPath = '/restaurant-pos/service',
    roles: string[] = ['test-role'],
    logout = vi.fn(() => of(undefined)),
    contextMock = makeContextMock(),
  ) => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem('locale', 'es');
    storage.setItem(
      'identity.session',
      JSON.stringify({
        userId: 'user-1',
        roles,
        permissions,
        accessToken: 'token',
      }),
    );

    const i18n = provideI18nTesting();

    const view = await render(RestaurantPosShellPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: { logout } },
        { provide: RestaurantContextStore, useValue: contextMock },
        { provide: RestaurantPosApiService, useValue: API_MOCK },
        provideRouter([
          {
            path: 'restaurant-pos',
            children: RESTAURANT_POS_SECTIONS.map((section) => ({ path: section.path, component: TestRoutePage })),
          },
        ]),
      ],
    });

    TestBed.inject(IdentitySessionStore);
    await TestBed.inject(Router).navigateByUrl(initialPath);
    view.fixture.detectChanges();

    return { storage, logout, router: TestBed.inject(Router), fixture: view.fixture, contextMock };
  };

  it('renders only the allowed restaurant POS navigation items', async () => {
    await renderPage(['service', 'layout', 'reservations']);

    // Desktop sidebar nav and the mobile bottom-bar nav render the same items
    // twice (one hidden by CSS per breakpoint), so navigation queries return
    // two matches here in jsdom, where the hidden copy still has a display box.
    expect(screen.getByRole('link', { name: /TPV restaurante/i })).toBeTruthy();
    expect(screen.getAllByRole('navigation', { name: /Navegaci.n principal/i }).length).toBe(2);
    for (const link of screen.getAllByRole('link', { name: /Servicio/i })) {
      expect(link.getAttribute('href')).toBe('/restaurant-pos/service');
    }
    for (const link of screen.getAllByRole('link', { name: /Plano/i })) {
      expect(link.getAttribute('href')).toBe('/restaurant-pos/layout');
    }
    for (const link of screen.getAllByRole('link', { name: /Reservas/i })) {
      expect(link.getAttribute('href')).toBe('/restaurant-pos/reservations');
    }
    expect(screen.queryByRole('link', { name: /MenÃº/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Cocina/i })).toBeNull();
  });

  it('marks the active section as the current page', async () => {
    await renderPage(['service', 'layout'], '/restaurant-pos/layout');

    for (const link of screen.getAllByRole('link', { name: /Plano/i })) {
      expect(link.getAttribute('aria-current')).toBe('page');
    }
  });

  it('shows the user admin link for admins and transitions on logout', async () => {
    vi.useFakeTimers();
    const logout = vi.fn(() => of(undefined));

    const { storage, router, fixture } = await renderPage(['service', 'layout'], '/restaurant-pos/service', ['admin'], logout);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const logoutButtons = screen.getAllByRole('button', { name: /Cerrar sesi.n/i });

    expect(screen.getAllByRole('link', { name: /Usuarios/i }).length).toBe(2);

    fireEvent.click(logoutButtons[0]);
    fixture.detectChanges();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(logoutButtons[0].getAttribute('aria-busy')).toBe('true');

    fireEvent.click(logoutButtons[0]);
    expect(logout).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(180);
    expect(storage.getItem('identity.session')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);

    vi.useRealTimers();
  });

  it('llama a load en el contexto de restaurante al iniciarse', async () => {
    const contextMock = makeContextMock();
    await renderPage(['service'], '/restaurant-pos/service', ['test-role'], vi.fn(() => of(undefined)), contextMock);
    expect(contextMock.load).toHaveBeenCalledTimes(1);
  });

  describe('selector de restaurante', () => {
    it('muestra el selector cuando hay múltiples restaurantes y ninguno activo', async () => {
      const contextMock = makeContextMock({ restaurants: [RESTAURANT_A, RESTAURANT_B], activeRestaurant: null });
      await renderPage(['service'], '/restaurant-pos/service', ['test-role'], vi.fn(() => of(undefined)), contextMock);
      expect(screen.getByRole('heading', { name: /Selecciona un restaurante/i })).toBeTruthy();
    });

    it('muestra los restaurantes disponibles como botones en el selector', async () => {
      const contextMock = makeContextMock({ restaurants: [RESTAURANT_A, RESTAURANT_B], activeRestaurant: null });
      await renderPage(['service'], '/restaurant-pos/service', ['test-role'], vi.fn(() => of(undefined)), contextMock);
      expect(screen.getByRole('button', { name: 'MesaFlow Centro' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'MesaFlow Norte' })).toBeTruthy();
    });

    it('al seleccionar un restaurante llama a setActiveRestaurantId con el id correcto', async () => {
      const contextMock = makeContextMock({ restaurants: [RESTAURANT_A, RESTAURANT_B], activeRestaurant: null });
      const { fixture } = await renderPage(['service'], '/restaurant-pos/service', ['test-role'], vi.fn(() => of(undefined)), contextMock);
      fireEvent.click(screen.getByRole('button', { name: 'MesaFlow Centro' }));
      fixture.detectChanges();
      expect(contextMock.setActiveRestaurantId).toHaveBeenCalledWith('r-a');
    });

    it('no muestra el selector cuando hay un restaurante activo', async () => {
      await renderPage(['service']);
      expect(screen.queryByRole('heading', { name: /Selecciona un restaurante/i })).toBeNull();
    });

    it('no muestra el selector cuando solo hay un restaurante', async () => {
      const contextMock = makeContextMock({ restaurants: [RESTAURANT_A], activeRestaurant: null });
      await renderPage(['service'], '/restaurant-pos/service', ['test-role'], vi.fn(() => of(undefined)), contextMock);
      expect(screen.queryByRole('heading', { name: /Selecciona un restaurante/i })).toBeNull();
    });
  });
});
