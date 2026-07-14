import { describe, expect, it, vi } from 'vitest';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { invalidPlatterComponentConfiguration } from '../../../shared/errors/application-error';
import { err, ok } from '../../../shared/result/result';
import type { PlatterComponentRepository } from '../ports/platter-component-repository.port';
import { CreatePlatterComponentUseCase } from './create-platter-component.use-case';

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

const command = {
  restaurantId: 'r-1',
  productId: 'rp-platter-1',
  name: 'Patatas fritas',
  componentProductId: 'product-patatas',
  quantity: 1,
  isRemovable: true,
  isReplaceable: false,
};

const context = {
  status: 'ok' as const,
  context: { restaurantProductId: 'rp-platter-1', productId: 'p-platter-1', organizationId: 'org-1', platterDefinitionId: 'pd-1' },
};

const created = {
  id: 'comp-1',
  platterDefinitionId: 'pd-1',
  componentProductId: 'product-patatas',
  name: 'Patatas fritas',
  quantity: 1,
  isRemovable: true,
  isReplaceable: false,
  sortOrder: 1,
};

describe('CreatePlatterComponentUseCase', () => {
  it('creates a platter component when the product is a valid platter', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue(context);
    vi.mocked(repo.isComponentProductValid).mockResolvedValue(true);
    vi.mocked(repo.create).mockResolvedValue(created);
    const useCase = new CreatePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(created));
    expect(repo.create).toHaveBeenCalledWith('pd-1', expect.objectContaining({ name: 'Patatas fritas' }));
  });

  it('creates a component without a linked product', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue(context);
    vi.mocked(repo.create).mockResolvedValue({ ...created, componentProductId: null });
    const useCase = new CreatePlatterComponentUseCase(repo);

    const result = await useCase.execute({ ...command, componentProductId: null });

    expect(result).toEqual(ok({ ...created, componentProductId: null }));
    expect(repo.isComponentProductValid).not.toHaveBeenCalled();
  });

  it('returns restaurant_product_not_found when the product does not exist in the restaurant', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue({ status: 'not_found' });
    const useCase = new CreatePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns invalid_platter_component_configuration when the product is not a platter', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue({ status: 'not_platter' });
    const useCase = new CreatePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_platter_component_configuration' })));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a quantity below 1', async () => {
    const repo = makeRepo();
    const useCase = new CreatePlatterComponentUseCase(repo);

    const result = await useCase.execute({ ...command, quantity: 0 });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_platter_component_configuration' })));
    expect(repo.resolvePlatterProductContext).not.toHaveBeenCalled();
  });

  it('rejects a componentProductId from another organization', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue(context);
    vi.mocked(repo.isComponentProductValid).mockResolvedValue(false);
    const useCase = new CreatePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_platter_component_configuration' })));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('propagates application errors thrown by the repository', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue(context);
    vi.mocked(repo.isComponentProductValid).mockResolvedValue(true);
    vi.mocked(repo.create).mockRejectedValue(
      new ApplicationErrorException(invalidPlatterComponentConfiguration('algo salio mal.')),
    );
    const useCase = new CreatePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_platter_component_configuration' })));
  });
});
