import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { MemoryKeyValueStorage, KEY_VALUE_STORAGE } from '../../../../shared/utils/storage/key-value-storage';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { IdentitySessionStore } from '../../../identity/identity-session.store';
import { RESTAURANT_POS_SECTIONS } from '../../restaurant-pos.routes';
import { RestaurantPosShellPage } from './restaurant-pos-shell-page';
import { IdentityApiService } from '../../../identity/api/identity-api.service';

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

    return { storage, logout, router: TestBed.inject(Router), fixture: view.fixture };
  };

  it('renders only the allowed restaurant POS navigation items', async () => {
    await renderPage(['service', 'layout']);

    expect(screen.getByRole('link', { name: /TPV restaurante/i })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: /Navegaci.n principal/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Servicio/i }).getAttribute('href')).toBe('/restaurant-pos/service');
    expect(screen.getByRole('link', { name: /Plano/i }).getAttribute('href')).toBe('/restaurant-pos/layout');
    expect(screen.queryByRole('link', { name: /MenÃº/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Cocina/i })).toBeNull();
  });

  it('marks the active section as the current page', async () => {
    await renderPage(['service', 'layout'], '/restaurant-pos/layout');

    expect(screen.getByRole('link', { name: /Plano/i }).getAttribute('aria-current')).toBe('page');
  });

  it('shows the user admin link for admins and transitions on logout', async () => {
    vi.useFakeTimers();
    const logout = vi.fn(() => of(undefined));

    const { storage, router, fixture } = await renderPage(['service', 'layout'], '/restaurant-pos/service', ['admin'], logout);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const logoutButtons = screen.getAllByRole('button', { name: /Cerrar sesi.n/i });

    expect(screen.getByRole('link', { name: /Usuarios/i })).toBeTruthy();

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
});
