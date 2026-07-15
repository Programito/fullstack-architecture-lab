import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { ModifierOptionOverrideRepository } from '../ports/modifier-option-override-repository.port';
import { ListModifierOptionOverridesUseCase } from './list-modifier-option-overrides.use-case';

function makeRepo(): ModifierOptionOverrideRepository {
  return {
    findOrganizationIdByRestaurantId: vi.fn(),
    findRestaurantProductId: vi.fn(),
    findModifierOptionOrganizationId: vi.fn(),
    listForRestaurantProduct: vi.fn(),
    setOverride: vi.fn(),
    clearOverride: vi.fn(),
  };
}

const command = { restaurantId: 'r-1', restaurantProductId: 'rp-1' };

describe('ListModifierOptionOverridesUseCase', () => {
  it('lists modifier options for the restaurant product with their resolved overrides', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findRestaurantProductId).mockResolvedValue('rp-1');
    const options = [
      {
        modifierOptionId: 'opt-1',
        modifierOptionName: 'Grande',
        modifierGroupId: 'g-1',
        modifierGroupName: 'Tamaño',
        defaultPriceDeltaCents: 100,
        overridePriceDeltaCents: 150,
      },
    ];
    vi.mocked(repo.listForRestaurantProduct).mockResolvedValue(options);
    const useCase = new ListModifierOptionOverridesUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(options));
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue(null);
    const useCase = new ListModifierOptionOverridesUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
  });

  it('returns restaurant_product_not_found when the product does not belong to the restaurant', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findRestaurantProductId).mockResolvedValue(null);
    const useCase = new ListModifierOptionOverridesUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
  });
});
