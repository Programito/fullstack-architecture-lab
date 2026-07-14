import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { ComboSlotRepository } from '../ports/combo-slot-repository.port';
import { UpdateComboSlotUseCase } from './update-combo-slot.use-case';

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

const existingSlot = {
  id: 'slot-1',
  comboDefinitionId: 'cd-1',
  name: 'Hamburguesa',
  minSelections: 1,
  maxSelections: 1,
  isRequired: true,
  sortOrder: 0,
  options: [{ id: 'opt-1', restaurantProductId: 'rp-burger-1', name: 'Hamburguesa clasica', supplementPriceCents: 0, isDefault: true, isAvailable: true, sortOrder: 1 }],
};

const command = {
  restaurantId: 'r-1',
  productId: 'rp-combo-1',
  slotId: 'slot-1',
  name: 'Hamburguesa premium',
};

describe('UpdateComboSlotUseCase', () => {
  it('updates a combo slot', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.findById).mockResolvedValue(existingSlot);
    const updated = { ...existingSlot, name: 'Hamburguesa premium' };
    vi.mocked(repo.update).mockResolvedValue(updated);
    const useCase = new UpdateComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(updated));
    expect(repo.update).toHaveBeenCalledWith('cd-1', 'slot-1', expect.objectContaining({ name: 'Hamburguesa premium' }));
  });

  it('returns restaurant_product_not_found when the product does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue({ status: 'not_found' });
    const useCase = new UpdateComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
  });

  it('returns combo_slot_not_found when the slot does not exist under this combo', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.findById).mockResolvedValue(null);
    const useCase = new UpdateComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'combo_slot_not_found' })));
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('validates minSelections/maxSelections against the existing slot when only one is provided', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.findById).mockResolvedValue({ ...existingSlot, minSelections: 1, maxSelections: 1 });
    const useCase = new UpdateComboSlotUseCase(repo);

    const result = await useCase.execute({ ...command, minSelections: 2 });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects replacing options with an empty array', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.findById).mockResolvedValue(existingSlot);
    const useCase = new UpdateComboSlotUseCase(repo);

    const result = await useCase.execute({ ...command, options: [] });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
  });

  it('rejects replacement options referencing a product from another restaurant', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.findById).mockResolvedValue(existingSlot);
    vi.mocked(repo.areRestaurantProductsValid).mockResolvedValue(false);
    const useCase = new UpdateComboSlotUseCase(repo);

    const result = await useCase.execute({
      ...command,
      options: [{ restaurantProductId: 'rp-other-restaurant', supplementPriceCents: 0 }],
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
    expect(repo.update).not.toHaveBeenCalled();
  });
});
