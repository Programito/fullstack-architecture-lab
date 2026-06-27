import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { ReorderMenuSectionItemsUseCase } from './reorder-menu-section-items.use-case';

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

describe('ReorderMenuSectionItemsUseCase', () => {
  it('reorders items when section exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findSectionById).mockResolvedValue({
      id: 'section-1',
      menuId: 'menu-1',
      name: 'Entrantes',
      sortOrder: 0,
      isVisible: true,
    });
    vi.mocked(repository.reorderSectionItems).mockResolvedValue(true);
    const useCase = new ReorderMenuSectionItemsUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      items: [
        { id: 'item-a', sortOrder: 0 },
        { id: 'item-b', sortOrder: 1 },
      ],
    });

    expect(result).toEqual(ok(undefined));
    expect(repository.reorderSectionItems).toHaveBeenCalledWith('r-1', 'menu-1', 'section-1', [
      { id: 'item-a', sortOrder: 0 },
      { id: 'item-b', sortOrder: 1 },
    ]);
  });

  it('returns menu_section_not_found when section does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findSectionById).mockResolvedValue(null);
    const useCase = new ReorderMenuSectionItemsUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'missing',
      items: [],
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_section_not_found' })));
    expect(repository.reorderSectionItems).not.toHaveBeenCalled();
  });
});
