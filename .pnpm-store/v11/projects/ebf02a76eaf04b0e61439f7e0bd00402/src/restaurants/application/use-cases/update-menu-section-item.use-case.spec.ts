import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';
import { UpdateMenuSectionItemUseCase } from './update-menu-section-item.use-case';

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

describe('UpdateMenuSectionItemUseCase', () => {
  it('updates display name and price override when item exists', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateSectionItem).mockResolvedValue({
      id: 'item-1',
      sectionId: 'section-1',
      restaurantProductId: 'rp-burger',
      displayNameOverride: 'Burger premium',
      priceOverrideCents: 1800,
      sortOrder: 0,
      isVisible: true,
    });
    const useCase = new UpdateMenuSectionItemUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      itemId: 'item-1',
      displayNameOverride: 'Burger premium',
      priceOverrideCents: 1800,
    });

    expect(result).toEqual(ok(expect.objectContaining({ id: 'item-1', displayNameOverride: 'Burger premium' })));
    expect(repository.updateSectionItem).toHaveBeenCalledWith('r-1', 'menu-1', 'section-1', 'item-1', {
      displayNameOverride: 'Burger premium',
      priceOverrideCents: 1800,
    });
  });

  it('allows clearing display name override with null', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateSectionItem).mockResolvedValue({
      id: 'item-1',
      sectionId: 'section-1',
      restaurantProductId: 'rp-burger',
      displayNameOverride: null,
      priceOverrideCents: null,
      sortOrder: 0,
      isVisible: true,
    });
    const useCase = new UpdateMenuSectionItemUseCase(repository);

    await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      itemId: 'item-1',
      displayNameOverride: null,
      priceOverrideCents: null,
    });

    expect(repository.updateSectionItem).toHaveBeenCalledWith('r-1', 'menu-1', 'section-1', 'item-1', {
      displayNameOverride: null,
      priceOverrideCents: null,
    });
  });

  it('returns menu_item_not_found when item does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.updateSectionItem).mockResolvedValue(null);
    const useCase = new UpdateMenuSectionItemUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'r-1',
      menuId: 'menu-1',
      sectionId: 'section-1',
      itemId: 'missing',
      isVisible: false,
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'menu_item_not_found' })));
  });
});
