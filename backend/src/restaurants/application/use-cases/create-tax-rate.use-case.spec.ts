import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { TaxRateRepository } from '../ports/tax-rate-repository.port';
import { CreateTaxRateUseCase } from './create-tax-rate.use-case';

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

const command = {
  restaurantId: 'r-1',
  name: 'IVA Reducido',
  ratePercent: 10,
};

const created = {
  id: 'tax-1',
  organizationId: 'org-1',
  name: 'IVA Reducido',
  ratePercent: 10,
  isActive: true,
};

describe('CreateTaxRateUseCase', () => {
  it('creates a tax rate in the restaurant organisation', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.create).mockResolvedValue(created);
    const useCase = new CreateTaxRateUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(created));
    expect(repo.create).toHaveBeenCalledWith({ organizationId: 'org-1', name: 'IVA Reducido', ratePercent: 10 });
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue(null);
    const useCase = new CreateTaxRateUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns invalid_tax_rate when ratePercent is out of range', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    const useCase = new CreateTaxRateUseCase(repo);

    const result = await useCase.execute({ ...command, ratePercent: 150 });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_tax_rate' })));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns tax_rate_name_taken when the name conflicts', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.create).mockRejectedValue(
      new ApplicationErrorException(applicationError('tax_rate_name_taken', 'Name taken.')),
    );
    const useCase = new CreateTaxRateUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'tax_rate_name_taken' })));
  });
});
