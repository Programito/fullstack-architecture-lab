export interface ModifierOptionOverride {
  modifierOptionId: string;
  modifierOptionName: string;
  modifierGroupId: string;
  modifierGroupName: string;
  defaultPriceDeltaCents: number;
  overridePriceDeltaCents: number | null;
  effectivePriceDeltaCents: number;
  isOverridden: boolean;
}
