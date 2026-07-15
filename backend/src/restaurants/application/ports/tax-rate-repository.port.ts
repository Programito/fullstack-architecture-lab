export const TAX_RATE_REPOSITORY = Symbol('TAX_RATE_REPOSITORY');

export type CreateTaxRateData = {
  organizationId: string;
  name: string;
  ratePercent: number;
  isActive?: boolean;
};

export type UpdateTaxRateData = {
  taxRateId: string;
  name?: string;
  ratePercent?: number;
  isActive?: boolean;
};

export type TaxRateEntity = {
  id: string;
  organizationId: string;
  name: string;
  ratePercent: number;
  isActive: boolean;
};

export interface TaxRateRepository {
  findOrganizationIdByRestaurantId(restaurantId: string): Promise<string | null>;
  findByOrganizationId(organizationId: string): Promise<TaxRateEntity[]>;
  findById(taxRateId: string): Promise<TaxRateEntity | null>;
  create(data: CreateTaxRateData): Promise<TaxRateEntity>;
  update(data: UpdateTaxRateData): Promise<TaxRateEntity>;
  isAssignedToAnyProduct(taxRateId: string): Promise<boolean>;
  delete(taxRateId: string): Promise<void>;
}
