import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { ModifierOptionOverrideRepository } from '../ports/modifier-option-override-repository.port';
import { ClearModifierOptionPriceOverrideUseCase } from './clear-modifier-option-price-override.use-case';

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

const command = { restaurantId: 'r-1', restaurantProductId: 'rp-1', modifierOptionId: 'opt-1' };

describe('ClearModifierOptionPriceOverrideUseCase', () => {
  it('clears the price override, reverting to the default price', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findRestaurantProductId).mockResolvedValue('rp-1');
    const useCase = new ClearModifierOptionPriceOverrideUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(undefined));
    expect(repo.clearOverride).toHaveBeenCalledWith('rp-1', 'opt-1');
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue(null);
    const useCase = new ClearModifierOptionPriceOverrideUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
    expect(repo.clearOverride).not.toHaveBeenCalled();
  });

  it('returns restaurant_product_not_found when the product does not belong to the restaurant', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findRestaurantProductId).mockResolvedValue(null);
    const useCase = new ClearModifierOptionPriceOverrideUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
    expect(repo.clearOverride).not.toHaveBeenCalled();
  });
});
