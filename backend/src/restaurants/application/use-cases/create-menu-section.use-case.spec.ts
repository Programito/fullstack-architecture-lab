import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { CreateMenuSectionUseCase } from './create-menu-section.use-case';

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

describe('CreateMenuSectionUseCase', () => {
  it('creates a section when the menu exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findMenuById).mockResolvedValue({ id: 'menu-1' });
    vi.mocked(repository.createSection).mockResolvedValue({
      id: 'section-1',
      menuId: 'menu-1',
      name: 'Entrantes',
      sortOrder: 0,
      isVisible: true,
    });
    const useCase = new CreateMenuSectionUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', menuId: 'menu-1', name: 'Entrantes' });

    expect(result).toEqual(ok({ id: 'section-1', menuId: 'menu-1', name: 'Entrantes', sortOrder: 0, isVisible: true }));
    expect(repository.createSection).toHaveBeenCalledWith('r-1', 'menu-1', { name: 'Entrantes', isVisible: true });
  });

  it('defaults isVisible to true when not provided', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findMenuById).mockResolvedValue({ id: 'menu-1' });
    vi.mocked(repository.createSection).mockResolvedValue({
      id: 'section-2',
      menuId: 'menu-1',
      name: 'Postres',
      sortOrder: 1,
      isVisible: true,
    });
    const useCase = new CreateMenuSectionUseCase(repository);

    await useCase.execute({ restaurantId: 'r-1', menuId: 'menu-1', name: 'Postres' });

    expect(repository.createSection).toHaveBeenCalledWith('r-1', 'menu-1', { name: 'Postres', isVisible: true });
  });

  it('returns menu_not_found when the menu does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findMenuById).mockResolvedValue(null);
    const useCase = new CreateMenuSectionUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', menuId: 'missing', name: 'Entrantes' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_not_found' })));
    expect(repository.createSection).not.toHaveBeenCalled();
  });

  it('returns menu_section_name_taken when the name already exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findMenuById).mockResolvedValue({ id: 'menu-1' });
    vi.mocked(repository.createSection).mockRejectedValue(
      new ApplicationErrorException(applicationError('menu_section_name_taken', 'Name taken.')),
    );
    const useCase = new CreateMenuSectionUseCase(repository);

    const result = await useCase.execute({ restaurantId: 'r-1', menuId: 'menu-1', name: 'Entrantes' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_section_name_taken' })));
  });
});
