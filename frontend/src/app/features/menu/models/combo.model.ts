export interface ComboSlot {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  allowedProductIds: string[];
  defaultProductId?: string;
}

export interface ComboSlotSelection {
  slotId: string;
  selectedProductIds: string[];
}

export type ComboPricingMode = 'fixed' | 'base_plus_supplements';

export interface ProductSupplement {
  slotId: string;
  productId: string;
  supplementPrice: number;
}

export interface ComboProductDefinition {
  productId: string;
  slots: ComboSlot[];
  pricingMode: ComboPricingMode;
  supplements: ProductSupplement[];
}
