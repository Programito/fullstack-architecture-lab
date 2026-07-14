import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { ModifierGroupRepository } from '../ports/modifier-group-repository.port';
import { UpdateModifierGroupUseCase } from './update-modifier-group.use-case';

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

const command = {
  restaurantId: 'r-1',
  groupId: 'g-1',
  name: 'Suplementos — Hamburguesa',
  selectionType: 'multiple' as const,
  minSelections: 0,
  maxSelections: 3,
  isRequired: false,
  options: [{ name: 'Bacon', priceDeltaCents: 150 }],
};

const existing = {
  id: 'g-1',
  organizationId: 'org-1',
  name: 'Suplementos — Hamburguesa',
  selectionType: 'multiple' as const,
  minSelections: 0,
  maxSelections: 3,
  isRequired: false,
  options: [],
  scope: 'product' as const,
  ownerRestaurantProductId: 'rp-1',
};

const updated = { ...existing, options: [{ id: 'o-1', name: 'Bacon', priceDeltaCents: 150, isAvailable: true }] };

describe('UpdateModifierGroupUseCase', () => {
  it('updates an existing modifier group', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(updated);
    const useCase = new UpdateModifierGroupUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(updated));
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'g-1', name: 'Suplementos — Hamburguesa' }),
    );
  });

  it('returns modifier_group_not_found when the group does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(null);
    const useCase = new UpdateModifierGroupUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'modifier_group_not_found' })));
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('returns modifier_group_name_taken when the new name conflicts', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockRejectedValue(
      new ApplicationErrorException(applicationError('modifier_group_name_taken', 'Name taken.')),
    );
    const useCase = new UpdateModifierGroupUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'modifier_group_name_taken' })));
  });
});
