export interface TaxRate {
  id: string;
  name: string;
  ratePercent: number;
  isActive: boolean;
}

export interface CreateTaxRateInput {
  name: string;
  ratePercent: number;
}

export interface UpdateTaxRateInput {
  name?: string;
  ratePercent?: number;
  isActive?: boolean;
}
