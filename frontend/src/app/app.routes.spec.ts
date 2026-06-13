import { routes } from './app.routes';
import { RESTAURANT_POS_SECTIONS } from './features/restaurant-pos/restaurant-pos.routes';

describe('app routes', () => {
  const restaurantPosRoute = () => routes.find((route) => route.path === 'restaurant-pos');

  it('redirects restaurant-pos to the service route', () => {
    const redirectRoute = restaurantPosRoute()?.children?.find((route) => route.path === '');

    expect(redirectRoute).toEqual(
      expect.objectContaining({
        pathMatch: 'full',
        redirectTo: 'service',
      }),
    );
  });

  it('wraps restaurant-pos routes in the restaurant shell', () => {
    expect(restaurantPosRoute()?.loadComponent).toBeTypeOf('function');
  });

  it('redirects the app root to the service route', () => {
    const redirectRoute = routes.find((route) => route.path === '');

    expect(redirectRoute).toEqual(
      expect.objectContaining({
        pathMatch: 'full',
        redirectTo: 'restaurant-pos/service',
      }),
    );
  });

  it('redirects unknown app routes to the service route', () => {
    const wildcardRoute = routes.find((route) => route.path === '**');

    expect(wildcardRoute).toEqual(
      expect.objectContaining({
        redirectTo: 'restaurant-pos/service',
      }),
    );
  });

  it('defines layout, service, and kitchen routes', () => {
    const childPaths = restaurantPosRoute()?.children?.map((route) => route.path);

    expect(childPaths).toEqual(expect.arrayContaining(RESTAURANT_POS_SECTIONS.map((section) => section.path)));
  });

  it('redirects unknown restaurant-pos child routes to service', () => {
    const wildcardRoute = restaurantPosRoute()?.children?.find((route) => route.path === '**');

    expect(wildcardRoute).toEqual(
      expect.objectContaining({
        redirectTo: 'service',
      }),
    );
  });
});
