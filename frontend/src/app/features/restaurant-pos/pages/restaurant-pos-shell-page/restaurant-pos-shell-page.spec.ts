import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { RESTAURANT_POS_SECTIONS } from '../../restaurant-pos.routes';
import { RestaurantPosShellPage } from './restaurant-pos-shell-page';

@Component({
  template: '',
})
class TestRoutePage {}

describe('RestaurantPosShellPage', () => {
  const renderPage = async (initialPath = '/restaurant-pos/service') => {
    const i18n = provideI18nTesting();

    const view = await render(RestaurantPosShellPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        provideRouter([
          {
            path: 'restaurant-pos',
            children: RESTAURANT_POS_SECTIONS.map((section) => ({ path: section.path, component: TestRoutePage })),
          },
        ]),
      ],
    });

    await TestBed.inject(Router).navigateByUrl(initialPath);
    view.fixture.detectChanges();
  };

  it('renders the restaurant POS side navigation', async () => {
    await renderPage();

    expect(screen.getByRole('link', { name: /TPV restaurante/i })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: /Navegaci.n principal/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Servicio/i }).getAttribute('href')).toBe('/restaurant-pos/service');
    expect(screen.getByRole('link', { name: /Menú/i }).getAttribute('href')).toBe('/restaurant-pos/menu');
    expect(screen.getByRole('link', { name: /Cocina/i }).getAttribute('href')).toBe('/restaurant-pos/kitchen');
    expect(screen.getByRole('link', { name: /Plano/i }).getAttribute('href')).toBe('/restaurant-pos/layout');
  });

  it('marks the active section as the current page', async () => {
    await renderPage('/restaurant-pos/kitchen');

    expect(screen.getByRole('link', { name: /Cocina/i }).getAttribute('aria-current')).toBe('page');
  });
});
