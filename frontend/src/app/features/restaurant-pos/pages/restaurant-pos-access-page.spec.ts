import { render, screen } from '@testing-library/angular';

import { provideI18nTesting } from '../../../shared/i18n/i18n-testing';
import { RestaurantPosAccessPage } from './restaurant-pos-access-page';

describe('RestaurantPosAccessPage', () => {
  it('renders the empty access state', async () => {
    const i18n = provideI18nTesting();

    await render(RestaurantPosAccessPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
    });

    expect(screen.getByRole('heading', { name: 'Sin módulos disponibles' })).toBeTruthy();
    expect(screen.getByText('Tu usuario no tiene permisos para acceder a las secciones operativas del TPV.')).toBeTruthy();
  });
});
