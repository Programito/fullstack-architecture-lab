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

export interface ProductPreparationPolicy {
  route: ProductPreparationRoute;
  requiresReadyBeforeServe: boolean;
}

export interface ProductCustomizationPolicy {
  modifierGroupIds: string[];
}

export interface CreateProductInput {
  name: string;
  description?: string;
  imageUrl?: string | null;
  modifierGroupIds?: string[];
  priceCents: number;
  currency: string;
  course: ProductCourse;
  preparationRoute: ProductPreparationRoute;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  modifierGroupIds?: string[];
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
  description?: string;
  imageUrl?: string | null;
  categoryId: string;
  basePrice: Money;
  available: ProductAvailability;
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
