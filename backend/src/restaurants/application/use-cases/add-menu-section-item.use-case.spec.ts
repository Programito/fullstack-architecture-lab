import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { AddMenuSectionItemUseCase } from './add-menu-section-item.use-case';

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

describe('AddMenuSectionItemUseCase', () => {
  it('adds a product to a section when the section exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findSectionById).mockResolvedValue({
      id: 'section-1',
      menuId: 'menu-1',
      name: 'Entrantes',
      sortOrder: 0,
      isVisible: true,
    });
    vi.mocked(repository.addSectionItem).mockResolvedValue({
      id: 'item-1',
      sectionId: 'section-1',
      restaurantProductId: 'rp-burger',
      displayNameOverride: null,
      priceOverrideCents: null,
      sortOrder: 0,
      isVisible: true,
    });
    const useCase = new AddMenuSectionItemUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      restaurantProductId: 'rp-burger',
    });

    expect(result).toEqual(ok({
      id: 'item-1',
      sectionId: 'section-1',
      restaurantProductId: 'rp-burger',
      displayNameOverride: null,
      priceOverrideCents: null,
      sortOrder: 0,
      isVisible: true,
    }));
    expect(repository.addSectionItem).toHaveBeenCalledWith('r-1', 'menu-1', 'section-1', {
      restaurantProductId: 'rp-burger',
      displayNameOverride: undefined,
      priceOverrideCents: undefined,
    });
  });

  it('passes display name and price override when provided', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findSectionById).mockResolvedValue({
      id: 'section-1',
      menuId: 'menu-1',
      name: 'Entrantes',
      sortOrder: 0,
      isVisible: true,
    });
    vi.mocked(repository.addSectionItem).mockResolvedValue({
      id: 'item-2',
      sectionId: 'section-1',
      restaurantProductId: 'rp-burger',
      displayNameOverride: 'Hamburguesa especial',
      priceOverrideCents: 1500,
      sortOrder: 1,
      isVisible: true,
    });
    const useCase = new AddMenuSectionItemUseCase(repository);

    await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      restaurantProductId: 'rp-burger',
      displayNameOverride: 'Hamburguesa especial',
      priceOverrideCents: 1500,
    });

    expect(repository.addSectionItem).toHaveBeenCalledWith('r-1', 'menu-1', 'section-1', {
      restaurantProductId: 'rp-burger',
      displayNameOverride: 'Hamburguesa especial',
      priceOverrideCents: 1500,
    });
  });

  it('returns menu_section_not_found when section does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findSectionById).mockResolvedValue(null);
    const useCase = new AddMenuSectionItemUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'missing',
      restaurantProductId: 'rp-burger',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_section_not_found' })));
    expect(repository.addSectionItem).not.toHaveBeenCalled();
  });

  it('returns menu_item_already_in_section when product is already assigned', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findSectionById).mockResolvedValue({
      id: 'section-1',
      menuId: 'menu-1',
      name: 'Entrantes',
      sortOrder: 0,
      isVisible: true,
    });
    vi.mocked(repository.addSectionItem).mockRejectedValue(
      new ApplicationErrorException(applicationError('menu_item_already_in_section', 'Already in section.')),
    );
    const useCase = new AddMenuSectionItemUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      restaurantProductId: 'rp-burger',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_item_already_in_section' })));
  });
});
