import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { ModifierGroupRepository } from '../ports/modifier-group-repository.port';
import { ListModifierGroupsUseCase } from './list-modifier-groups.use-case';

function makeRepo(): ModifierGroupRepository {
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

const group = {
  id: 'g-1',
  organizationId: 'org-1',
  name: 'Extras',
  selectionType: 'multiple' as const,
  minSelections: 0,
  maxSelections: 3,
  isRequired: false,
  options: [],
  scope: 'shared' as const,
  ownerRestaurantProductId: null,
};

describe('ListModifierGroupsUseCase', () => {
  it('returns groups for the restaurant organisation', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findByOrganizationId).mockResolvedValue([group]);
    const useCase = new ListModifierGroupsUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1' });

    expect(result).toEqual(ok([group]));
    expect(repo.findOrganizationIdByRestaurantId).toHaveBeenCalledWith('r-1');
    expect(repo.findByOrganizationId).toHaveBeenCalledWith('org-1', undefined);
  });

  it('forwards the scope filter to the repository', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findByOrganizationId).mockResolvedValue([group]);
    const useCase = new ListModifierGroupsUseCase(repo);

    await useCase.execute({ restaurantId: 'r-1', scope: 'shared' });

    expect(repo.findByOrganizationId).toHaveBeenCalledWith('org-1', 'shared');
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue(null);
    const useCase = new ListModifierGroupsUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'missing' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
    expect(repo.findByOrganizationId).not.toHaveBeenCalled();
  });
});
