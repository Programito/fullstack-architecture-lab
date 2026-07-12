import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { PlatterComponentRepository } from '../ports/platter-component-repository.port';
import { DeletePlatterComponentUseCase } from './delete-platter-component.use-case';

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

const command = { restaurantId: 'r-1', productId: 'rp-platter-1', componentId: 'comp-1' };

describe('DeletePlatterComponentUseCase', () => {
  it('deletes a platter component', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue(context);
    vi.mocked(repo.delete).mockResolvedValue(true);
    const useCase = new DeletePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(ok(undefined));
    expect(repo.delete).toHaveBeenCalledWith('pd-1', 'comp-1');
  });

  it('returns restaurant_product_not_found when the product does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue({ status: 'not_found' });
    const useCase = new DeletePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
  });

  it('returns invalid_platter_component_configuration when the product is not a platter', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue({ status: 'not_platter' });
    const useCase = new DeletePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_platter_component_configuration' })));
  });

  it('returns platter_component_not_found when the component does not exist', async () => {
    const repo = makeRepo();
    vi.mocked(repo.resolvePlatterProductContext).mockResolvedValue(context);
    vi.mocked(repo.delete).mockResolvedValue(false);
    const useCase = new DeletePlatterComponentUseCase(repo);

    const result = await useCase.execute(command);

    expect(result).toEqual(err(expect.objectContaining({ code: 'platter_component_not_found' })));
  });
});
