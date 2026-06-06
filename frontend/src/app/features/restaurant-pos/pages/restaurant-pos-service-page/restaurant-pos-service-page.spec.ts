import { render, screen } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { RestaurantPosServicePage } from './restaurant-pos-service-page';

describe('RestaurantPosServicePage', () => {
  it('renders the service placeholder', async () => {
    const i18n = provideI18nTesting();
    await render(RestaurantPosServicePage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
    });

    expect(screen.getByRole('heading', { name: 'Vista de servicio próximamente' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cambiar a modo oscuro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Idioma: Español' })).toBeTruthy();
  });
});
