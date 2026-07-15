import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { TaxRateRepository } from '../ports/tax-rate-repository.port';
import { DeleteTaxRateUseCase } from './delete-tax-rate.use-case';

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

describe('DeleteTaxRateUseCase', () => {
  it('deletes a tax rate not assigned to any product', async () => {
    const repo = makeRepo();
    vi.mocked(repo.isAssignedToAnyProduct).mockResolvedValue(false);
    const useCase = new DeleteTaxRateUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1', taxRateId: 'tax-1' });

    expect(result).toEqual(ok(undefined));
    expect(repo.delete).toHaveBeenCalledWith('tax-1');
  });

  it('returns tax_rate_in_use when the tax rate is assigned to products', async () => {
    const repo = makeRepo();
    vi.mocked(repo.isAssignedToAnyProduct).mockResolvedValue(true);
    const useCase = new DeleteTaxRateUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1', taxRateId: 'tax-1' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'tax_rate_in_use' })));
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
