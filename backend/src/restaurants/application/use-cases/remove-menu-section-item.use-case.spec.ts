import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { RemoveMenuSectionItemUseCase } from './remove-menu-section-item.use-case';

function makeRepository(): RestaurantMenuAdminRepository {
  return {
    findMenuById: vi.fn(),
    findSectionById: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    findItemById: vi.fn(),
    addSectionItem: vi.fn(),
    updateSectionItem: vi.fn(),
    removeSectionItem: vi.fn(),
  };
}

describe('RemoveMenuSectionItemUseCase', () => {
  it('removes item when it exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.removeSectionItem).mockResolvedValue(true);
    const useCase = new RemoveMenuSectionItemUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      itemId: 'item-1',
    });

    expect(result).toEqual(ok(undefined));
    expect(repository.removeSectionItem).toHaveBeenCalledWith('r-1', 'menu-1', 'section-1', 'item-1');
  });

  it('returns menu_item_not_found when item does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.removeSectionItem).mockResolvedValue(false);
    const useCase = new RemoveMenuSectionItemUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      itemId: 'missing',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_item_not_found' })));
  });
});
