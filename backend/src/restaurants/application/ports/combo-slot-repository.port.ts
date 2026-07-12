import type { NameI18n } from '../../domain/restaurant-read.models';

export const COMBO_SLOT_REPOSITORY = Symbol('COMBO_SLOT_REPOSITORY');

export type ComboSlotOptionData = {
  restaurantProductId: string;
  supplementPriceCents: number;
  isDefault?: boolean;
};

export type CreateComboSlotData = {
  name: string;
  nameI18n?: NameI18n;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: ComboSlotOptionData[];
};

export type UpdateComboSlotData = {
  name?: string;
  nameI18n?: NameI18n;
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
  // If provided, replaces the full set of options for the slot (same
  // wholesale-replace pattern used by ModifierGroup options).
  options?: ComboSlotOptionData[];
};

export type ComboSlotOptionEntity = {
  id: string;
  restaurantProductId: string;
  // Display name for a combo slot option always comes from the linked
  // RestaurantProduct/Product, never from a field of its own — see
  // docs/superpowers/plans/2026-07-11-menu-multilingual-names.md.
  name: string;
  supplementPriceCents: number;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder: number;
};

export type ComboSlotEntity = {
  id: string;
  comboDefinitionId: string;
  name: string;
  nameI18n?: NameI18n;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  sortOrder: number;
  options: ComboSlotOptionEntity[];
};

export type ComboProductContext = {
  restaurantProductId: string;
  productId: string;
  comboDefinitionId: string;
};

export type ResolveComboProductContextResult =
  | { status: 'ok'; context: ComboProductContext }
  | { status: 'not_found' }
  | { status: 'not_combo' };

export interface ComboSlotRepository {
  /**
   * Resolves a RestaurantProduct id (the `:productId` route param, matching
   * the existing product routes) into its owning ComboDefinition, verifying
   * it belongs to the given restaurant and is a `combo` product. Auto-creates
   * the ComboDefinition row on first use if the product doesn't have one yet
   * (there is no separate endpoint to create it explicitly — see plan).
   */
  resolveComboProductContext(restaurantId: string, restaurantProductId: string): Promise<ResolveComboProductContextResult>;
  findById(comboDefinitionId: string, slotId: string): Promise<ComboSlotEntity | null>;
  areRestaurantProductsValid(restaurantId: string, restaurantProductIds: string[]): Promise<boolean>;
  create(comboDefinitionId: string, data: CreateComboSlotData): Promise<ComboSlotEntity>;
  update(comboDefinitionId: string, slotId: string, data: UpdateComboSlotData): Promise<ComboSlotEntity | null>;
  delete(comboDefinitionId: string, slotId: string): Promise<boolean>;
}
