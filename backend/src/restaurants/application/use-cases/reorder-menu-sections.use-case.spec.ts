import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { ReorderMenuSectionsUseCase } from './reorder-menu-sections.use-case';

function makeRepository(): RestaurantMenuAdminRepository {
  return {
    findMenuById: vi.fn(),
    findSectionById: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    reorderSections: vi.fn(),
    findItemById: vi.fn(),
    addSectionItem: vi.fn(),
    updateSectionItem: vi.fn(),
    removeSectionItem: vi.fn(),
    reorderSectionItems: vi.fn(),
    listRestaurantProducts: vi.fn(),
  };
}

describe('ReorderMenuSectionsUseCase', () => {
  it('reorders sections when menu exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findMenuById).mockResolvedValue({ id: 'menu-1' });
    vi.mocked(repository.reorderSections).mockResolvedValue(true);
    const useCase = new ReorderMenuSectionsUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      items: [
        { id: 'section-a', sortOrder: 0 },
        { id: 'section-b', sortOrder: 1 },
      ],
    });

    expect(result).toEqual(ok(undefined));
    expect(repository.reorderSections).toHaveBeenCalledWith('r-1', 'menu-1', [
      { id: 'section-a', sortOrder: 0 },
      { id: 'section-b', sortOrder: 1 },
    ]);
  });

  it('returns menu_not_found when menu does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findMenuById).mockResolvedValue(null);
    const useCase = new ReorderMenuSectionsUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', menuId: 'missing', items: [] });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_not_found' })));
    expect(repository.reorderSections).not.toHaveBeenCalled();
  });
});
