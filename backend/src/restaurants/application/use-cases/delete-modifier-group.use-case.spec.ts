import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { ModifierGroupRepository } from '../ports/modifier-group-repository.port';
import { DeleteModifierGroupUseCase } from './delete-modifier-group.use-case';

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

describe('DeleteModifierGroupUseCase', () => {
  it('deletes a modifier group that is not in use', async () => {
    const repo = makeRepo();
    vi.mocked(repo.isAssignedToAnyProduct).mockResolvedValue(false);
    vi.mocked(repo.delete).mockResolvedValue(undefined);
    const useCase = new DeleteModifierGroupUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1', groupId: 'g-1' });

    expect(result).toEqual(ok(undefined));
    expect(repo.delete).toHaveBeenCalledWith('g-1');
  });

  it('returns modifier_group_in_use when the group is assigned to products', async () => {
    const repo = makeRepo();
    vi.mocked(repo.isAssignedToAnyProduct).mockResolvedValue(true);
    const useCase = new DeleteModifierGroupUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'r-1', groupId: 'g-1' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'modifier_group_in_use' })));
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
