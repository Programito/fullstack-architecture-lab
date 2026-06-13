export interface ComboSlot {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  allowedProductIds: string[];
}

