import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'restaurant-pos',
    loadComponent: () =>
      import('./features/restaurant-pos/pages/restaurant-pos-shell-page/restaurant-pos-shell-page').then(
        (module) => module.RestaurantPosShellPage,
      ),
    children: [
      {
        path: 'layout',
        loadComponent: () =>
          import('./features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page').then(
            (module) => module.RestaurantPosLayoutPage,
          ),
      },
      {
        path: 'service',
        loadComponent: () =>
          import('./features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page').then(
            (module) => module.RestaurantPosServicePage,
          ),
      },
      {
        path: 'kitchen',
        loadComponent: () =>
          import('./features/restaurant-pos/pages/restaurant-pos-kitchen-page/restaurant-pos-kitchen-page').then(
            (module) => module.RestaurantPosKitchenPage,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'service',
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'restaurant-pos/service',
  },
];
