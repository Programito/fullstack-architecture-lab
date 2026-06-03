import { render, screen } from '@testing-library/angular';
import { RestaurantPosServicePage } from './restaurant-pos-service-page';

describe('RestaurantPosServicePage', () => {
  it('renders the service placeholder', async () => {
    await render(RestaurantPosServicePage);

    expect(screen.getByRole('heading', { name: 'Service view coming next' })).toBeTruthy();
  });
});
