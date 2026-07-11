import type { ModifierOption } from './modifier-option.model';
import type { NameI18n } from './name-i18n.model';

export type ModifierGroupType = 'single' | 'multiple' | 'remove';
export type ModifierGroupDisplayType = 'add' | 'remove' | 'single-choice' | 'multi-choice';

export function deriveModifierGroupDisplayType(group: {
  type: ModifierGroupType;
  options: ReadonlyArray<Pick<ModifierOption, 'priceDelta'>>;
}): ModifierGroupDisplayType {
  if (group.type === 'remove') {
    return 'remove';
  }

  if (group.type === 'single') {
    return 'single-choice';
  }

  return group.options.length > 0 && group.options.every((option) => option.priceDelta > 0) ? 'add' : 'multi-choice';
}

export type ModifierGroupScope = 'shared' | 'product';

export interface ModifierGroup {
  id: string;
  name: string;
  nameI18n?: NameI18n;
  type: ModifierGroupType;
  displayType?: ModifierGroupDisplayType;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
  scope?: ModifierGroupScope;
  ownerRestaurantProductId?: string | null;
}

