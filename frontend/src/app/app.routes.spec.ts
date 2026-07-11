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

  it('redirects the app root to login', () => {
    const redirectRoute = routes.find((route) => route.path === '');

    expect(redirectRoute).toEqual(
      expect.objectContaining({
        pathMatch: 'full',
        redirectTo: 'login',
      }),
    );
  });

  it('redirects unknown app routes to login', () => {
    const wildcardRoute = routes.find((route) => route.path === '**');

    expect(wildcardRoute).toEqual(
      expect.objectContaining({
        redirectTo: 'login',
      }),
    );
  });

  it('defines login and developer routes', () => {
    expect(routes.find((route) => route.path === 'login')?.loadComponent).toBeTypeOf('function');
    expect(routes.find((route) => route.path === 'developer')?.loadComponent).toBeTypeOf('function');
    expect(routes.find((route) => route.path === 'developer/tables')?.loadComponent).toBeTypeOf('function');
  });

  it('wraps user administration in the restaurant shell', () => {
    const adminUsersRoute = restaurantPosRoute()?.children?.find((route) => route.path === 'admin/users');

    expect(adminUsersRoute?.loadComponent).toBeTypeOf('function');
    expect(adminUsersRoute?.canActivate).toBeDefined();
  });

  it('defines restaurant-pos section routes from the shared config', () => {
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
