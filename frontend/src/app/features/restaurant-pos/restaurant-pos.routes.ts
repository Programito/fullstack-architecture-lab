import type { Type } from '@angular/core';

export type RestaurantPosSectionPath = 'service' | 'kitchen' | 'layout';

export type RestaurantPosSection = {
  path: RestaurantPosSectionPath;
  labelKey: string;
  icon: string;
  loadComponent: () => Promise<Type<unknown>>;
};

export const RESTAURANT_POS_BASE_PATH = 'restaurant-pos';
export const RESTAURANT_POS_DEFAULT_SECTION: RestaurantPosSectionPath = 'service';
export const RESTAURANT_POS_DEFAULT_URL = `${RESTAURANT_POS_BASE_PATH}/${RESTAURANT_POS_DEFAULT_SECTION}`;

export const RESTAURANT_POS_SECTIONS: readonly RestaurantPosSection[] = [
  {
    path: 'service',
    labelKey: 'restaurantPos.common.service',
    icon: 'room_service',
    loadComponent: () =>
      import('./pages/restaurant-pos-service-page/restaurant-pos-service-page').then((module) => module.RestaurantPosServicePage),
  },
  {
    path: 'kitchen',
    labelKey: 'restaurantPos.common.kitchen',
    icon: 'restaurant',
    loadComponent: () =>
      import('./pages/restaurant-pos-kitchen-page/restaurant-pos-kitchen-page').then((module) => module.RestaurantPosKitchenPage),
  },
  {
    path: 'layout',
    labelKey: 'restaurantPos.common.layout',
    icon: 'dashboard_customize',
    loadComponent: () =>
      import('./pages/restaurant-pos-layout-page/restaurant-pos-layout-page').then((module) => module.RestaurantPosLayoutPage),
  },
];
