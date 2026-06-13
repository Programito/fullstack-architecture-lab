import type { ModifierGroupType } from './modifier-group.model';

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  priceDelta: number;
  type: ModifierGroupType;
}

