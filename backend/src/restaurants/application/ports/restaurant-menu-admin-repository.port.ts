import type { RestaurantMenuItemView, RestaurantMenuSectionView, RestaurantProductSummary } from '../../domain/restaurant-read.models';

export const RESTAURANT_MENU_ADMIN_REPOSITORY = Symbol('RESTAURANT_MENU_ADMIN_REPOSITORY');

export type SortOrderItem = { id: string; sortOrder: number };

export interface RestaurantMenuAdminRepository {
  findMenuById(restaurantId: string, menuId: string): Promise<{ id: string } | null>;
  findSectionById(restaurantId: string, menuId: string, sectionId: string): Promise<RestaurantMenuSectionView | null>;
  createSection(restaurantId: string, menuId: string, data: { name: string; isVisible: boolean }): Promise<RestaurantMenuSectionView>;
  updateSection(restaurantId: string, menuId: string, sectionId: string, data: { name?: string; isVisible?: boolean }): Promise<RestaurantMenuSectionView | null>;
  deleteSection(restaurantId: string, menuId: string, sectionId: string): Promise<boolean>;
  reorderSections(restaurantId: string, menuId: string, items: SortOrderItem[]): Promise<boolean>;
  findItemById(restaurantId: string, menuId: string, sectionId: string, itemId: string): Promise<RestaurantMenuItemView | null>;
  addSectionItem(restaurantId: string, menuId: string, sectionId: string, data: { restaurantProductId: string; displayNameOverride?: string; priceOverrideCents?: number }): Promise<RestaurantMenuItemView>;
  updateSectionItem(restaurantId: string, menuId: string, sectionId: string, itemId: string, data: { displayNameOverride?: string | null; priceOverrideCents?: number | null; isVisible?: boolean }): Promise<RestaurantMenuItemView | null>;
  removeSectionItem(restaurantId: string, menuId: string, sectionId: string, itemId: string): Promise<boolean>;
  reorderSectionItems(restaurantId: string, menuId: string, sectionId: string, items: SortOrderItem[]): Promise<boolean>;
  listRestaurantProducts(restaurantId: string): Promise<RestaurantProductSummary[]>;
}
