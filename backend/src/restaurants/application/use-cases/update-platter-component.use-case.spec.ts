import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { PlatterComponentRepository } from '../ports/platter-component-repository.port';
import { UpdatePlatterComponentUseCase } from './update-platter-component.use-case';

function makeRepo(): PlatterComponentRepository {
  return {
    resolvePlatterProductContext: vi.fn(),
    findById: vi.fn(),
    isComponentProductValid: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

const context = {
  status: 'ok' as const,
  context: { restaurantProductId: 'rp-platter-1', productId: 'p-platter-1', organizationId: 'org-1', platterDefinitionId: 'pd-1' },
};

const existingComponent = {
  id: 'comp-1',
  platterDefinitionId: 'pd-1',
  componentProductId: null,
  name: 'Patatas fritas',
  quantity: 1,
  isRemovable: true,
  isReplaceable: false,
  sortOrder: 1,
};

const command = {
  restaurantId: 'r-1',
  productId: 'rp-platter-1',
  componentId: 'comp-1',
  name: 'Patatas fritas caseras',
};

describe('UpdatePlatterComponentUseCase', () => {
  it('updates a platter component', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue(context);
    vi.mocked(repo.findById).mockResolvedValue(existingComponent);
    const updated = { ...existingComponent, name: 'Patatas fritas caseras' };
    vi.mocked(repo.update).mockResolvedValue(updated);
    const useCase = new UpdatePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(updated));
    expect(repo.update).toHaveBeenCalledWith('pd-1', 'comp-1', expect.objectContaining({ name: 'Patatas fritas caseras' }));
  });

  it('returns restaurant_product_not_found when the product does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue({ status: 'not_found' });
    const useCase = new UpdatePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
  });

  it('returns platter_component_not_found when the component does not exist under this platter', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue(context);
    vi.mocked(repo.findById).mockResolvedValue(null);
    const useCase = new UpdatePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'platter_component_not_found' })));
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects a quantity below 1', async () => {
    const repo = makeRepo();
    const useCase = new UpdatePlatterComponentUseCase(repo);

    const result = await useCase.execute({ ...command, quantity: 0 });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_platter_component_configuration' })));
    expect(repo.resolvePlatterProductContext).not.toHaveBeenCalled();
  });

  it('rejects a componentProductId from another organization', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue(context);
    vi.mocked(repo.findById).mockResolvedValue(existingComponent);
    vi.mocked(repo.isComponentProductValid).mockResolvedValue(false);
    const useCase = new UpdatePlatterComponentUseCase(repo);

    const result = await useCase.execute({ ...command, componentProductId: 'product-other-org' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_platter_component_configuration' })));
    expect(repo.update).not.toHaveBeenCalled();
  });
});
