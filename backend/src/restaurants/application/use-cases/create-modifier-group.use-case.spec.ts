import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { ModifierGroupRepository } from '../ports/modifier-group-repository.port';
import { CreateModifierGroupUseCase } from './create-modifier-group.use-case';

function makeRepo(): ModifierGroupRepository {
  return {
    findOrganizationIdByRestaurantId: vi.fn(),
    findByOrganizationId: vi.fn(),
    create: vi.fn(),
    isAssignedToAnyProduct: vi.fn(),
    delete: vi.fn(),
  };
}

const command = {
  restaurantId: 'r-1',
  name: 'Extras',
  selectionType: 'multiple' as const,
  minSelections: 0,
  maxSelections: 3,
  isRequired: false,
  options: [{ name: 'Queso extra', priceDeltaCents: 50 }],
};

const created = {
  id: 'g-1',
  organizationId: 'org-1',
  name: 'Extras',
  selectionType: 'multiple' as const,
  minSelections: 0,
  maxSelections: 3,
  isRequired: false,
  options: [{ id: 'o-1', name: 'Queso extra', priceDeltaCents: 50, isAvailable: true }],
};

describe('CreateModifierGroupUseCase', () => {
  it('creates a modifier group in the restaurant organisation', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.create).mockResolvedValue(created);
    const useCase = new CreateModifierGroupUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(created));
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org-1', name: 'Extras' }));
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue(null);
    const useCase = new CreateModifierGroupUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns modifier_group_name_taken when the name conflicts', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.create).mockRejectedValue(
      new ApplicationErrorException(applicationError('modifier_group_name_taken', 'Name taken.')),
    );
    const useCase = new CreateModifierGroupUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'modifier_group_name_taken' })));
  });
});
