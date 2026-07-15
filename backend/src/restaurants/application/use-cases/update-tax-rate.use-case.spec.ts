import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { TaxRateRepository } from '../ports/tax-rate-repository.port';
import { UpdateTaxRateUseCase } from './update-tax-rate.use-case';

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

const existing = {
  id: 'tax-1',
  organizationId: 'org-1',
  name: 'IVA Reducido',
  ratePercent: 10,
  isActive: true,
};

describe('UpdateTaxRateUseCase', () => {
  it('updates an existing tax rate', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue({ ...existing, ratePercent: 21, isActive: false });
    const useCase = new UpdateTaxRateUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1', taxRateId: 'tax-1', ratePercent: 21, isActive: false });

    expect(result).toEqual(ok({ ...existing, ratePercent: 21, isActive: false }));
    expect(repo.update).toHaveBeenCalledWith({ taxRateId: 'tax-1', name: undefined, ratePercent: 21, isActive: false });
  });

  it('returns tax_rate_not_found when the tax rate does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    const useCase = new UpdateTaxRateUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1', taxRateId: 'missing', ratePercent: 21 });

    expect(result).toEqual(err(expect.objectContaining({ code: 'tax_rate_not_found' })));
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('returns invalid_tax_rate when ratePercent is out of range', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing);
    const useCase = new UpdateTaxRateUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1', taxRateId: 'tax-1', ratePercent: -5 });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_tax_rate' })));
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('returns tax_rate_name_taken when the name conflicts', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockRejectedValue(
      new ApplicationErrorException(applicationError('tax_rate_name_taken', 'Name taken.')),
    );
    const useCase = new UpdateTaxRateUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1', taxRateId: 'tax-1', name: 'IVA General' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'tax_rate_name_taken' })));
  });
});
