import { firstAllowedRestaurantPosUrl } from '../restaurant-pos/restaurant-pos.routes';

export function authenticatedHome(roles: readonly string[], permissions: Parameters<typeof firstAllowedRestaurantPosUrl>[0]): string {
  return roles.includes('developer') ? '/developer' : firstAllowedRestaurantPosUrl(permissions);
}
