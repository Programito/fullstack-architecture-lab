import { inject, type Type } from '@angular/core';
import type { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Router } from '@angular/router';

import { IdentitySessionStore } from '../identity/identity-session.store';
import type { PermissionName } from '../identity/models/permission.model';
import { RestaurantContextStore } from './state/restaurant-context.store';

export type RestaurantPosSectionPath = 'service' | 'time' | 'menu' | 'kitchen' | 'layout' | 'reservations' | 'dashboard';

export type RestaurantPosSection = {
  path: RestaurantPosSectionPath;
  labelKey: string;
  icon: string;
  requiredPermission: PermissionName;
  loadComponent: () => Promise<Type<unknown>>;
};

export const RESTAURANT_POS_BASE_PATH = 'restaurant-pos';
export const RESTAURANT_POS_DEFAULT_SECTION: RestaurantPosSectionPath = 'service';
export const RESTAURANT_POS_DEFAULT_URL = `${RESTAURANT_POS_BASE_PATH}/${RESTAURANT_POS_DEFAULT_SECTION}`;
export const RESTAURANT_POS_ACCESS_PATH = 'access';
export const RESTAURANT_POS_ACCESS_URL = `${RESTAURANT_POS_BASE_PATH}/${RESTAURANT_POS_ACCESS_PATH}`;

export const RESTAURANT_POS_SECTIONS: readonly RestaurantPosSection[] = [
  {
    path: 'service',
    labelKey: 'restaurantPos.common.service',
    icon: 'room_service',
    requiredPermission: 'service',
    loadComponent: () =>
      import('./pages/restaurant-pos-service-page/restaurant-pos-service-page').then((module) => module.RestaurantPosServicePage),
  },
  {
    path: 'time',
    labelKey: 'restaurantPos.common.time',
    icon: 'schedule',
    requiredPermission: 'time_tracking',
    loadComponent: () =>
      import('./pages/restaurant-pos-time-page/restaurant-pos-time-page').then((module) => module.RestaurantPosTimePage),
  },
  {
    path: 'menu',
    labelKey: 'restaurantPos.common.menu',
    icon: 'restaurant_menu',
    requiredPermission: 'menu',
    loadComponent: () => import('../menu/pages/menu-page/menu-page').then((module) => module.MenuPage),
  },
  {
    path: 'kitchen',
    labelKey: 'restaurantPos.common.kitchen',
    icon: 'restaurant',
    requiredPermission: 'kitchen',
    loadComponent: () =>
      import('./pages/restaurant-pos-kitchen-page/restaurant-pos-kitchen-page').then((module) => module.RestaurantPosKitchenPage),
  },
  {
    path: 'layout',
    labelKey: 'restaurantPos.common.layout',
    icon: 'dashboard_customize',
    requiredPermission: 'layout',
    loadComponent: () =>
      import('./pages/restaurant-pos-layout-page/restaurant-pos-layout-page').then((module) => module.RestaurantPosLayoutPage),
  },
  {
    path: 'reservations',
    labelKey: 'restaurantPos.common.reservations',
    icon: 'event_available',
    requiredPermission: 'reservations',
    loadComponent: () =>
      import('./pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page').then(
        (module) => module.RestaurantPosReservationsPage,
      ),
  },
  {
    path: 'dashboard',
    labelKey: 'restaurantPos.common.dashboard',
    icon: 'monitoring',
    requiredPermission: 'dashboard',
    loadComponent: () =>
      import('./pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page').then(
        (module) => module.RestaurantPosDashboardPage,
      ),
  },
] as const;

export function firstAllowedRestaurantPosUrl(permissions: readonly PermissionName[]): string {
  const allowedSection = RESTAURANT_POS_SECTIONS.find((section) => permissions.includes(section.requiredPermission));
  return allowedSection
    ? `/${RESTAURANT_POS_BASE_PATH}/${allowedSection.path}`
    : `/${RESTAURANT_POS_ACCESS_URL}`;
}

export const restaurantPosSectionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
): boolean | UrlTree => {
  const router = inject(Router);
  const identity = inject(IdentitySessionStore);
  const requiredPermission = route.data['requiredPermission'];
  if (requiredPermission && typeof requiredPermission === 'string' && identity.hasPermission(requiredPermission as PermissionName)) {
    return true;
  }
  return router.parseUrl(firstAllowedRestaurantPosUrl(identity.permissions()));
};

export const restaurantScopeGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);
  const identity = inject(IdentitySessionStore);
  const restaurantContext = inject(RestaurantContextStore);

  const activeRestaurant = restaurantContext.activeRestaurant();
  if (!activeRestaurant) return true;

  const scopes = identity.scopes();
  if (scopes.organizations.length > 0) return true;
  if (scopes.restaurants.length === 0) return true;
  if (scopes.restaurants.includes(activeRestaurant.id)) return true;

  return router.parseUrl(`/${RESTAURANT_POS_ACCESS_URL}`);
};
