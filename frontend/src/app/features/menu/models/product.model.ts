import type { NameI18n } from './name-i18n.model';

export type Money = number;
export type ProductName = string;
export type ProductAvailability = boolean;

export const PRODUCT_TYPES = {
  simple: 'simple',
  combo: 'combo',
  platter: 'platter',
} as const;

export type ProductType = (typeof PRODUCT_TYPES)[keyof typeof PRODUCT_TYPES];

export const PRODUCT_COURSES = {
  drinks: 'drinks',
  starter: 'starter',
  main: 'main',
  dessert: 'dessert',
  other: 'other',
} as const;

export type ProductCourse = (typeof PRODUCT_COURSES)[keyof typeof PRODUCT_COURSES];

export const PREPARATION_ROUTES = {
  direct: 'direct',
  bar: 'bar',
  kitchen: 'kitchen',
  coldStation: 'cold_station',
  dessertStation: 'dessert_station',
} as const;

export type ProductPreparationRoute = (typeof PREPARATION_ROUTES)[keyof typeof PREPARATION_ROUTES];

export type Allergen =
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soybeans'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

export interface ProductPreparationPolicy {
  route: ProductPreparationRoute;
  requiresReadyBeforeServe: boolean;
}

export interface ProductCustomizationPolicy {
  modifierGroupIds: string[];
}

export interface CreateProductInput {
  name: string;
  nameI18n?: NameI18n;
  description?: string;
  imageUrl?: string | null;
  modifierGroupIds?: string[];
  allergens?: Allergen[];
  priceCents: number;
  currency: string;
  course: ProductCourse;
  preparationRoute: ProductPreparationRoute;
}

export interface UpdateProductInput {
  name?: string;
  nameI18n?: NameI18n;
  description?: string | null;
  imageUrl?: string | null;
  modifierGroupIds?: string[];
  allergens?: Allergen[];
  priceCents?: number;
  course?: ProductCourse;
  preparationRoute?: ProductPreparationRoute;
  isAvailable?: boolean;
  isVisible?: boolean;
}

export interface PlatterComponent {
  id: string;
  name: ProductName;
  productId?: string;
  quantity?: number;
  removable: boolean;
  replaceable: boolean;
}

export interface Product {
  id: string;
  restaurantProductId?: string;
  name: ProductName;
  nameI18n?: NameI18n;
  description?: string;
  imageUrl?: string | null;
  categoryId: string;
  basePrice: Money;
  available: ProductAvailability;
  // string[] on purpose: menu-mock.service.ts fills this with localized display
  // text for demo search, not the backend `Allergen` enum keys. The admin form
  // and API request types (CreateProductInput/UpdateProductInput) use the
  // strict `Allergen` union instead.
  allergens?: string[];
  course: ProductCourse;
  type: ProductType;
  modifierGroupIds: string[];
  preparationPolicy: ProductPreparationPolicy;
  comboDefinitionId?: string;
  platterComponents?: PlatterComponent[];
  category?: string;
  price?: Money;
}
