export const MODIFIER_GROUP_REPOSITORY = Symbol('MODIFIER_GROUP_REPOSITORY');

export type ModifierGroupOptionData = {
  name: string;
  priceDeltaCents: number;
  imageUrl?: string | null;
};

export type CreateModifierGroupData = {
  organizationId: string;
  name: string;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: ModifierGroupOptionData[];
  scope?: 'shared' | 'product';
  ownerRestaurantProductId?: string | null;
};

export type UpdateModifierGroupData = {
  groupId: string;
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
  imageUrl?: string | null;
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
  scope: 'shared' | 'product';
  ownerRestaurantProductId: string | null;
};

export interface ModifierGroupRepository {
  findOrganizationIdByRestaurantId(restaurantId: string): Promise<string | null>;
  findByOrganizationId(organizationId: string, scope?: 'shared' | 'product'): Promise<ModifierGroupEntity[]>;
  findById(groupId: string): Promise<ModifierGroupEntity | null>;
  create(data: CreateModifierGroupData): Promise<ModifierGroupEntity>;
  update(data: UpdateModifierGroupData): Promise<ModifierGroupEntity>;
  isAssignedToAnyProduct(groupId: string): Promise<boolean>;
  delete(groupId: string): Promise<void>;
}
