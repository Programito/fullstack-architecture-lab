import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { TaxRateRepository } from '../ports/tax-rate-repository.port';
import { ListTaxRatesUseCase } from './list-tax-rates.use-case';

function makeRepo(): TaxRateRepository {
  return {
    findOrganizationIdByRestaurantId: vi.fn(),
    findByOrganizationId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    isAssignedToAnyProduct: vi.fn(),
    delete: vi.fn(),
  };
}

const taxRate = {
  id: 'tax-1',
  organizationId: 'org-1',
  name: 'IVA General',
  ratePercent: 21,
  isActive: true,
};

describe('ListTaxRatesUseCase', () => {
  it('returns tax rates for the restaurant organisation', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findByOrganizationId).mockResolvedValue([taxRate]);
    const useCase = new ListTaxRatesUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1' });

    expect(result).toEqual(ok([taxRate]));
    expect(repo.findOrganizationIdByRestaurantId).toHaveBeenCalledWith('r-1');
    expect(repo.findByOrganizationId).toHaveBeenCalledWith('org-1');
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue(null);
    const useCase = new ListTaxRatesUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'missing' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
    expect(repo.findByOrganizationId).not.toHaveBeenCalled();
  });
});
