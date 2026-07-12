import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { ComboSlotRepository } from '../ports/combo-slot-repository.port';
import { DeleteComboSlotUseCase } from './delete-combo-slot.use-case';

function makeRepo(): ComboSlotRepository {
  return {
    resolveComboProductContext: vi.fn(),
    findById: vi.fn(),
    areRestaurantProductsValid: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

const context = {
  status: 'ok' as const,
  context: { restaurantProductId: 'rp-combo-1', productId: 'p-combo-1', comboDefinitionId: 'cd-1' },
};

const command = { restaurantId: 'r-1', productId: 'rp-combo-1', slotId: 'slot-1' };

describe('DeleteComboSlotUseCase', () => {
  it('deletes a combo slot', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.delete).mockResolvedValue(true);
    const useCase = new DeleteComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(undefined));
    expect(repo.delete).toHaveBeenCalledWith('cd-1', 'slot-1');
  });

  it('returns restaurant_product_not_found when the product does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue({ status: 'not_found' });
    const useCase = new DeleteComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
  });

  it('returns invalid_combo_slot_configuration when the product is not a combo', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue({ status: 'not_combo' });
    const useCase = new DeleteComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
  });

  it('returns combo_slot_not_found when the slot does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.delete).mockResolvedValue(false);
    const useCase = new DeleteComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'combo_slot_not_found' })));
  });
});
