import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { DeleteMenuSectionUseCase } from './delete-menu-section.use-case';

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

describe('DeleteMenuSectionUseCase', () => {
  it('deletes the section when it exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.deleteSection).mockResolvedValue(true);
    const useCase = new DeleteMenuSectionUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', menuId: 'menu-1', sectionId: 'section-1' });

    expect(result).toEqual(ok(undefined));
    expect(repository.deleteSection).toHaveBeenCalledWith('r-1', 'menu-1', 'section-1');
  });

  it('returns menu_section_not_found when section does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.deleteSection).mockResolvedValue(false);
    const useCase = new DeleteMenuSectionUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', menuId: 'menu-1', sectionId: 'missing' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_section_not_found' })));
  });
});
