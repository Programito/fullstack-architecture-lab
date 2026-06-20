import { Routes } from '@angular/router';
import {
  RESTAURANT_POS_ACCESS_PATH,
  RESTAURANT_POS_BASE_PATH,
  RESTAURANT_POS_DEFAULT_SECTION,
  RESTAURANT_POS_SECTIONS,
  restaurantPosSectionGuard,
} from './features/restaurant-pos/restaurant-pos.routes';
import { adminGuard, anonymousOnlyGuard, authenticatedGuard, developerGuard } from './features/identity/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [anonymousOnlyGuard],
    loadComponent: () =>
      import('./features/identity/pages/login-page/login-page').then((module) => module.LoginPage),
  },
  {
    path: 'developer',
    canActivate: [developerGuard],
    loadComponent: () =>
      import('./features/identity/pages/developer-page/developer-page').then((module) => module.DeveloperPage),
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/identity/pages/user-admin-page/user-admin-page').then((module) => module.UserAdminPage),
  },
  {
    path: RESTAURANT_POS_BASE_PATH,
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./features/restaurant-pos/pages/restaurant-pos-shell-page/restaurant-pos-shell-page').then(
        (module) => module.RestaurantPosShellPage,
      ),
    children: [
      ...RESTAURANT_POS_SECTIONS.map(({ path, loadComponent, requiredPermission }) => ({
        path,
        loadComponent,
        canActivate: [restaurantPosSectionGuard],
        data: { requiredPermission },
      })),
      {
        path: RESTAURANT_POS_ACCESS_PATH,
        loadComponent: () =>
          import('./features/restaurant-pos/pages/restaurant-pos-access-page').then(
            (module) => module.RestaurantPosAccessPage,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: RESTAURANT_POS_DEFAULT_SECTION,
      },
      {
        path: '**',
        redirectTo: RESTAURANT_POS_DEFAULT_SECTION,
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
