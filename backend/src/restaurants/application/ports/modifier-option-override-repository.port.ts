export const MODIFIER_OPTION_OVERRIDE_REPOSITORY = Symbol('MODIFIER_OPTION_OVERRIDE_REPOSITORY');

export type ModifierOptionForProductEntity = {
  modifierOptionId: string;
  modifierOptionName: string;
  modifierGroupId: string;
  modifierGroupName: string;
  defaultPriceDeltaCents: number;
  overridePriceDeltaCents: number | null;
};

export type SetModifierOptionPriceOverrideData = {
  restaurantProductId: string;
  modifierOptionId: string;
  priceDeltaCents: number;
};

export interface ModifierOptionOverrideRepository {
  findOrganizationIdByRestaurantId(restaurantId: string): Promise<string | null>;
  /** Confirms the restaurant product belongs to the given restaurant. */
  findRestaurantProductId(restaurantId: string, restaurantProductId: string): Promise<string | null>;
  /** Confirms the modifier option belongs to a modifier group in the given organization. */
  findModifierOptionOrganizationId(modifierOptionId: string): Promise<string | null>;
  /** Lists every modifier option assigned (via its group) to the given restaurant product, with the effective override applied if any. */
  listForRestaurantProduct(restaurantProductId: string): Promise<ModifierOptionForProductEntity[]>;
  setOverride(data: SetModifierOptionPriceOverrideData): Promise<ModifierOptionForProductEntity>;
  clearOverride(restaurantProductId: string, modifierOptionId: string): Promise<void>;
}
