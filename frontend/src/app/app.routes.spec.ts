import { routes } from './app.routes';

describe('app routes', () => {
  it('redirects restaurant-pos to the service route', () => {
    const restaurantPosRoute = routes.find((route) => route.path === 'restaurant-pos');
    const redirectRoute = restaurantPosRoute?.children?.find((route) => route.path === '');

    expect(redirectRoute).toEqual(
      expect.objectContaining({
        pathMatch: 'full',
        redirectTo: 'service',
      }),
    );
  });

  it('wraps restaurant-pos routes in the restaurant shell', () => {
    const restaurantPosRoute = routes.find((route) => route.path === 'restaurant-pos');

    expect(restaurantPosRoute?.loadComponent).toBeTypeOf('function');
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

  it('defines layout, service, and kitchen routes', () => {
    const childPaths = routes.find((route) => route.path === 'restaurant-pos')?.children?.map((route) => route.path);

    expect(childPaths).toContain('layout');
    expect(childPaths).toContain('service');
    expect(childPaths).toContain('kitchen');
  });
});
