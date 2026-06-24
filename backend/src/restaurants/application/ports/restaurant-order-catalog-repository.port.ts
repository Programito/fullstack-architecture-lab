import type { RestaurantMenu } from '../../domain/restaurant-read.models';

export const RESTAURANT_ORDER_CATALOG_REPOSITORY = Symbol('RESTAURANT_ORDER_CATALOG_REPOSITORY');

export interface RestaurantOrderCatalogRepository {
  findActiveMenu(restaurantId: string): Promise<RestaurantMenu | null>;
}
