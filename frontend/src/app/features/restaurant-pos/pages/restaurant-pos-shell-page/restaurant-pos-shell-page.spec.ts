import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { RestaurantPosShellPage } from './restaurant-pos-shell-page';

describe('RestaurantPosShellPage', () => {
  it('renders the restaurant POS side navigation', async () => {
    const i18n = provideI18nTesting();

    await render(RestaurantPosShellPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers, provideRouter([])],
    });

    expect(screen.getByRole('link', { name: /TPV restaurante/i })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Navegacion principal' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Servicio/i }).getAttribute('href')).toBe('/restaurant-pos/service');
    expect(screen.getByRole('link', { name: /Cocina/i }).getAttribute('href')).toBe('/restaurant-pos/kitchen');
    expect(screen.getByRole('link', { name: /Plano/i }).getAttribute('href')).toBe('/restaurant-pos/layout');
  });
});
