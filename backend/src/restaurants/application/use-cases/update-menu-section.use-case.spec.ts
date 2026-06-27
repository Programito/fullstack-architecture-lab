import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { UpdateMenuSectionUseCase } from './update-menu-section.use-case';

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

describe('UpdateMenuSectionUseCase', () => {
  it('updates section name when section exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateSection).mockResolvedValue({
      id: 'section-1',
      menuId: 'menu-1',
      name: 'Primeros',
      sortOrder: 0,
      isVisible: true,
    });
    const useCase = new UpdateMenuSectionUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      name: 'Primeros',
    });

    expect(result).toEqual(ok({ id: 'section-1', menuId: 'menu-1', name: 'Primeros', sortOrder: 0, isVisible: true }));
    expect(repository.updateSection).toHaveBeenCalledWith('r-1', 'menu-1', 'section-1', { name: 'Primeros' });
  });

  it('updates visibility without changing name', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateSection).mockResolvedValue({
      id: 'section-1',
      menuId: 'menu-1',
      name: 'Entrantes',
      sortOrder: 0,
      isVisible: false,
    });
    const useCase = new UpdateMenuSectionUseCase(repository);

    await useCase.execute({ restaurantId: 'r-1', menuId: 'menu-1', sectionId: 'section-1', isVisible: false });

    expect(repository.updateSection).toHaveBeenCalledWith('r-1', 'menu-1', 'section-1', { isVisible: false });
  });

  it('returns menu_section_not_found when section does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateSection).mockResolvedValue(null);
    const useCase = new UpdateMenuSectionUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'missing',
      name: 'X',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_section_not_found' })));
  });

  it('returns menu_section_name_taken when the new name is already used', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateSection).mockRejectedValue(
      new ApplicationErrorException(applicationError('menu_section_name_taken', 'Name taken.')),
    );
    const useCase = new UpdateMenuSectionUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      name: 'Entrantes',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_section_name_taken' })));
  });
});
