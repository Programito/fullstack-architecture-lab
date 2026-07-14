import type { Product } from '../models/menu.models';
import type { RestaurantProductDetailDto, RestaurantProductSummaryDto } from '../services/menu-api.service';

export function mapRestaurantProductDetailToCachedMenuProduct(
  product: RestaurantProductDetailDto,
  current: Product,
  categoryId: string | null,
): Product {
  return {
    ...current,
    restaurantProductId: product.id,
    name: product.displayName ?? product.name,
    description: product.displayDescription ?? product.description ?? '',
    imageUrl: product.imageUrl,
    categoryId: categoryId ?? current.categoryId,
    available: product.isAvailable,
    visible: product.isVisible,
    basePrice: product.priceCents / 100,
    modifierGroupIds: product.modifierGroupIds,
    allergens: product.allergens,
    course: product.course,
    type: product.productType,
    preparationPolicy: {
      ...current.preparationPolicy,
      route: product.preparationRoute,
      requiresReadyBeforeServe: product.preparationRoute !== 'direct',
    },
  };
}

export function mapRestaurantProductDetailToCatalogSummary(
  product: RestaurantProductDetailDto,
  current: RestaurantProductSummaryDto,
): RestaurantProductSummaryDto {
  return {
    ...current,
    id: product.id,
    productId: product.productId,
    name: product.name,
    displayName: product.displayName,
    imageUrl: product.imageUrl,
    modifierGroupIds: product.modifierGroupIds,
    productType: product.productType,
    course: product.course,
    preparationRoute: product.preparationRoute,
    priceCents: product.priceCents,
    currency: product.currency,
    isAvailable: product.isAvailable,
    isVisible: product.isVisible,
    allergens: product.allergens,
  };
}
