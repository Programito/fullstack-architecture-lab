import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { ModifierOptionOverrideRepository } from '../ports/modifier-option-override-repository.port';
import { SetModifierOptionPriceOverrideUseCase } from './set-modifier-option-price-override.use-case';

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

const command = { restaurantId: 'r-1', restaurantProductId: 'rp-1', modifierOptionId: 'opt-1', priceDeltaCents: 150 };

const override = {
  modifierOptionId: 'opt-1',
  modifierOptionName: 'Grande',
  modifierGroupId: 'g-1',
  modifierGroupName: 'Tamaño',
  defaultPriceDeltaCents: 100,
  overridePriceDeltaCents: 150,
};

describe('SetModifierOptionPriceOverrideUseCase', () => {
  it('sets the price override for the modifier option on the restaurant product', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findRestaurantProductId).mockResolvedValue('rp-1');
    vi.mocked(repo.findModifierOptionOrganizationId).mockResolvedValue('org-1');
    vi.mocked(repo.setOverride).mockResolvedValue(override);
    const useCase = new SetModifierOptionPriceOverrideUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(override));
    expect(repo.setOverride).toHaveBeenCalledWith({ restaurantProductId: 'rp-1', modifierOptionId: 'opt-1', priceDeltaCents: 150 });
  });

  it('returns invalid_modifier_option_override when priceDeltaCents is negative', async () => {
    const repo = makeRepo();
    const useCase = new SetModifierOptionPriceOverrideUseCase(repo);

    const result = await useCase.execute({ ...command, priceDeltaCents: -1 });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_modifier_option_override' })));
    expect(repo.findOrganizationIdByRestaurantId).not.toHaveBeenCalled();
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue(null);
    const useCase = new SetModifierOptionPriceOverrideUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
  });

  it('returns restaurant_product_not_found when the product does not belong to the restaurant', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findRestaurantProductId).mockResolvedValue(null);
    const useCase = new SetModifierOptionPriceOverrideUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
  });

  it('returns modifier_option_not_found when the option does not belong to the organization', async () => {
    const repo = makeRepo();
    vi.mocked(repo.findOrganizationIdByRestaurantId).mockResolvedValue('org-1');
    vi.mocked(repo.findRestaurantProductId).mockResolvedValue('rp-1');
    vi.mocked(repo.findModifierOptionOrganizationId).mockResolvedValue('org-2');
    const useCase = new SetModifierOptionPriceOverrideUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'modifier_option_not_found' })));
    expect(repo.setOverride).not.toHaveBeenCalled();
  });
});
