import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';

import { provideI18nTesting } from '../../shared/i18n/i18n-testing';
import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../shared/utils/storage/key-value-storage';
import { routes } from '../../app.routes';

@Component({
  selector: 'app-test-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class TestHostComponent {}

describe('restaurant POS route permissions', () => {
  const renderApp = async (permissions: string[], initialUrl: string) => {
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

    const view = await render(TestHostComponent, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, { provide: KEY_VALUE_STORAGE, useValue: storage }, provideRouter(routes)],
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
