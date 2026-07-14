import { describe, expect, it, vi } from 'vitest';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { invalidComboSlotConfiguration } from '../../../shared/errors/application-error';
import { err, ok } from '../../../shared/result/result';
import type { ComboSlotRepository } from '../ports/combo-slot-repository.port';
import { CreateComboSlotUseCase } from './create-combo-slot.use-case';

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

const command = {
  restaurantId: 'r-1',
  productId: 'rp-combo-1',
  name: 'Hamburguesa',
  minSelections: 1,
  maxSelections: 1,
  isRequired: true,
  options: [{ restaurantProductId: 'rp-burger-1', supplementPriceCents: 0, isDefault: true }],
};

const context = {
  status: 'ok' as const,
  context: { restaurantProductId: 'rp-combo-1', productId: 'p-combo-1', comboDefinitionId: 'cd-1' },
};

const created = {
  id: 'slot-1',
  comboDefinitionId: 'cd-1',
  name: 'Hamburguesa',
  minSelections: 1,
  maxSelections: 1,
  isRequired: true,
  sortOrder: 0,
  options: [{ id: 'opt-1', restaurantProductId: 'rp-burger-1', name: 'Hamburguesa clasica', supplementPriceCents: 0, isDefault: true, isAvailable: true, sortOrder: 1 }],
};

describe('CreateComboSlotUseCase', () => {
  it('creates a combo slot when the product is a valid combo and options are consistent', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.areRestaurantProductsValid).mockResolvedValue(true);
    vi.mocked(repo.create).mockResolvedValue(created);
    const useCase = new CreateComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(created));
    expect(repo.create).toHaveBeenCalledWith('cd-1', expect.objectContaining({ name: 'Hamburguesa' }));
  });

  it('returns restaurant_product_not_found when the product does not exist in the restaurant', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue({ status: 'not_found' });
    const useCase = new CreateComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns invalid_combo_slot_configuration when the product is not a combo', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue({ status: 'not_combo' });
    const useCase = new CreateComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects when minSelections is greater than maxSelections', async () => {
    const repo = makeRepo();
    const useCase = new CreateComboSlotUseCase(repo);

    const result = await useCase.execute({ ...command, minSelections: 2, maxSelections: 1 });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
    expect(repo.resolveComboProductContext).not.toHaveBeenCalled();
  });

  it('rejects when there are no options', async () => {
    const repo = makeRepo();
    const useCase = new CreateComboSlotUseCase(repo);

    const result = await useCase.execute({ ...command, options: [] });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
  });

  it('rejects when the same product appears twice in the options', async () => {
    const repo = makeRepo();
    const useCase = new CreateComboSlotUseCase(repo);

    const result = await useCase.execute({
      ...command,
      options: [
        { restaurantProductId: 'rp-burger-1', supplementPriceCents: 0 },
        { restaurantProductId: 'rp-burger-1', supplementPriceCents: 100 },
      ],
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
  });

  it('rejects when more than one option is marked as default', async () => {
    const repo = makeRepo();
    const useCase = new CreateComboSlotUseCase(repo);

    const result = await useCase.execute({
      ...command,
      options: [
        { restaurantProductId: 'rp-burger-1', supplementPriceCents: 0, isDefault: true },
        { restaurantProductId: 'rp-burger-2', supplementPriceCents: 100, isDefault: true },
      ],
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
  });

  it('rejects when an option references a product from another restaurant', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.areRestaurantProductsValid).mockResolvedValue(false);
    const useCase = new CreateComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('propagates application errors thrown by the repository (e.g. duplicate slot name)', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolveComboProductContext).mockResolvedValue(context);
    vi.mocked(repo.areRestaurantProductsValid).mockResolvedValue(true);
    vi.mocked(repo.create).mockRejectedValue(
      new ApplicationErrorException(invalidComboSlotConfiguration('ya existe un hueco con ese nombre.')),
    );
    const useCase = new CreateComboSlotUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_combo_slot_configuration' })));
  });
});
