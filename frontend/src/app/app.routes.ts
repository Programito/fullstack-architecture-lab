import { Routes } from '@angular/router';
import {
  RESTAURANT_POS_BASE_PATH,
  RESTAURANT_POS_DEFAULT_SECTION,
  RESTAURANT_POS_DEFAULT_URL,
  RESTAURANT_POS_SECTIONS,
} from './features/restaurant-pos/restaurant-pos.routes';

export const routes: Routes = [
  {
    path: RESTAURANT_POS_BASE_PATH,
    loadComponent: () =>
      import('./features/restaurant-pos/pages/restaurant-pos-shell-page/restaurant-pos-shell-page').then(
        (module) => module.RestaurantPosShellPage,
      ),
    children: [
      ...RESTAURANT_POS_SECTIONS.map(({ path, loadComponent }) => ({ path, loadComponent })),
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
    redirectTo: RESTAURANT_POS_DEFAULT_URL,
  },
  {
    path: '**',
    redirectTo: RESTAURANT_POS_DEFAULT_URL,
  },
];
