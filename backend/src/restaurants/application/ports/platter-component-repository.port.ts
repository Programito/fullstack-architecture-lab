import type { NameI18n } from '../../domain/restaurant-read.models';

export const PLATTER_COMPONENT_REPOSITORY = Symbol('PLATTER_COMPONENT_REPOSITORY');

export type CreatePlatterComponentData = {
  name: string;
  nameI18n?: NameI18n;
  // References Product.id (organization-level catalog), not RestaurantProduct
  // — matches the schema (PlatterComponent.componentProductId -> Product),
  // unlike ComboSlotOption which references RestaurantProduct.
  componentProductId?: string | null;
  quantity?: number | null;
  isRemovable: boolean;
  isReplaceable: boolean;
};

export type UpdatePlatterComponentData = {
  name?: string;
  nameI18n?: NameI18n;
  componentProductId?: string | null;
  quantity?: number | null;
  isRemovable?: boolean;
  isReplaceable?: boolean;
};

export type PlatterComponentEntity = {
  id: string;
  platterDefinitionId: string;
  componentProductId: string | null;
  name: string;
  nameI18n?: NameI18n;
  quantity: number | null;
  isRemovable: boolean;
  isReplaceable: boolean;
  sortOrder: number;
};

export type PlatterProductContext = {
  restaurantProductId: string;
  productId: string;
  organizationId: string;
  platterDefinitionId: string;
};

export type ResolvePlatterProductContextResult =
  | { status: 'ok'; context: PlatterProductContext }
  | { status: 'not_found' }
  | { status: 'not_platter' };

export interface PlatterComponentRepository {
  /**
   * Resolves a RestaurantProduct id (the `:productId` route param, matching
   * the existing product routes) into its owning PlatterDefinition,
   * verifying it belongs to the given restaurant and is a `platter` product.
   * Auto-creates the PlatterDefinition row on first use if the product
   * doesn't have one yet (no separate endpoint to create it explicitly).
   */
  resolvePlatterProductContext(restaurantId: string, restaurantProductId: string): Promise<ResolvePlatterProductContextResult>;
  findById(platterDefinitionId: string, componentId: string): Promise<PlatterComponentEntity | null>;
  isComponentProductValid(organizationId: string, componentProductId: string): Promise<boolean>;
  create(platterDefinitionId: string, data: CreatePlatterComponentData): Promise<PlatterComponentEntity>;
  update(platterDefinitionId: string, componentId: string, data: UpdatePlatterComponentData): Promise<PlatterComponentEntity | null>;
  delete(platterDefinitionId: string, componentId: string): Promise<boolean>;
}
