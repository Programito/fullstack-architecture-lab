export const MODIFIER_GROUP_REPOSITORY = Symbol('MODIFIER_GROUP_REPOSITORY');

export type ModifierGroupOptionData = {
  name: string;
  priceDeltaCents: number;
};

export type CreateModifierGroupData = {
  organizationId: string;
  name: string;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: ModifierGroupOptionData[];
};

export type ModifierGroupOptionEntity = {
  id: string;
  name: string;
  priceDeltaCents: number;
  isAvailable: boolean;
};

export type ModifierGroupEntity = {
  id: string;
  organizationId: string;
  name: string;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: ModifierGroupOptionEntity[];
};

export interface ModifierGroupRepository {
  findOrganizationIdByRestaurantId(restaurantId: string): Promise<string | null>;
  findByOrganizationId(organizationId: string): Promise<ModifierGroupEntity[]>;
  create(data: CreateModifierGroupData): Promise<ModifierGroupEntity>;
  isAssignedToAnyProduct(groupId: string): Promise<boolean>;
  delete(groupId: string): Promise<void>;
}
