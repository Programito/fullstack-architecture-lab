import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { Router, provideRouter } from '@angular/router';

import { MemoryKeyValueStorage, KEY_VALUE_STORAGE } from '../../../../shared/utils/storage/key-value-storage';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { IdentitySessionStore } from '../../../identity/identity-session.store';
import { RESTAURANT_POS_SECTIONS } from '../../restaurant-pos.routes';
import { RestaurantPosShellPage } from './restaurant-pos-shell-page';

@Component({
  template: '',
})
class TestRoutePage {}

describe('RestaurantPosShellPage', () => {
  const renderPage = async (permissions: string[], initialPath = '/restaurant-pos/service') => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem('locale', 'es');
    storage.setItem(
      'identity.session',
      JSON.stringify({
        userId: 'user-1',
        roles: ['test-role'],
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
});
