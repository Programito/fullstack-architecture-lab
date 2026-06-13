import type { ModifierOption } from './modifier-option.model';

export type ModifierGroupType = 'single' | 'multiple' | 'remove';

export interface ModifierGroup {
  id: string;
  name: string;
  type: ModifierGroupType;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

