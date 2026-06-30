import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { seedMesaFlowDemo } from './mesaflow-demo.seed';

describe('seedMesaFlowDemo', () => {
  it('creates the demo organization, restaurant, taxes, catalog, menu, modifiers, combo and platter data idempotently', async () => {
    let productSeq = 0;
    let sectionSeq = 0;
    let modifierGroupSeq = 0;
    let comboSlotSeq = 0;

    const organizationUpsert = vi.fn().mockResolvedValue({ id: 'org-demo' });
    const restaurantUpsert = vi.fn().mockResolvedValue({ id: 'rest-demo', organizationId: 'org-demo', currency: 'EUR' });
    const taxRateUpsert = vi.fn().mockResolvedValue({ id: 'tax-general' });
    const productUpsert = vi.fn().mockImplementation(async () => ({ id: `product-${++productSeq}` }));
    const restaurantProductUpsert = vi.fn().mockImplementation(
      async ({ where }: { where: { restaurantId_productId: { productId: string } } }) => ({
        id: `sale-${where.restaurantId_productId.productId}`,
      }),
    );
    const restaurantMenuUpsert = vi.fn().mockResolvedValue({ id: 'menu-main' });
    const menuSectionUpsert = vi.fn().mockImplementation(async () => ({ id: `section-${++sectionSeq}` }));
    const menuItemDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const menuItemCreate = vi.fn().mockResolvedValue(undefined);
    const modifierGroupUpsert = vi.fn().mockImplementation(async () => ({ id: `group-${++modifierGroupSeq}` }));
    const modifierOptionUpsert = vi.fn().mockResolvedValue(undefined);
    const restaurantProductModifierGroupUpsert = vi.fn().mockResolvedValue(undefined);
    const comboDefinitionUpsert = vi.fn().mockResolvedValue({ id: 'combo-definition' });
    const comboSlotUpsert = vi.fn().mockImplementation(async () => ({ id: `combo-slot-${++comboSlotSeq}` }));
    const comboSlotOptionUpsert = vi.fn().mockResolvedValue(undefined);
    const platterDefinitionUpsert = vi.fn().mockResolvedValue({ id: 'platter-definition' });
    const platterComponentUpsert = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      organization: { upsert: organizationUpsert },
      restaurant: { upsert: restaurantUpsert },
      taxRate: { upsert: taxRateUpsert },
      product: { upsert: productUpsert },
      restaurantProduct: { upsert: restaurantProductUpsert },
      restaurantMenu: { upsert: restaurantMenuUpsert },
      menuSection: { upsert: menuSectionUpsert },
      menuItem: { deleteMany: menuItemDeleteMany, create: menuItemCreate },
      modifierGroup: { upsert: modifierGroupUpsert },
      modifierOption: { upsert: modifierOptionUpsert },
      restaurantProductModifierGroup: { upsert: restaurantProductModifierGroupUpsert },
      comboDefinition: { upsert: comboDefinitionUpsert },
      comboSlot: { upsert: comboSlotUpsert },
      comboSlotOption: { upsert: comboSlotOptionUpsert },
      platterDefinition: { upsert: platterDefinitionUpsert },
      platterComponent: { upsert: platterComponentUpsert },
    } as unknown as PrismaClient;

    await seedMesaFlowDemo(prisma);

    expect(organizationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: 'MesaFlow Demo' } }),
    );
    expect(restaurantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_name: { organizationId: 'org-demo', name: 'MesaFlow Centro' } },
      }),
    );
    expect(taxRateUpsert).toHaveBeenCalledTimes(3);

    // 24 products: 4 drinks + 4 burgers + 4 tapas + 2 salads + 3 platters + 2 desserts + 2 coffee + 1 combo + 1 sandwich + 1 wine
    expect(productUpsert).toHaveBeenCalledTimes(24);
    expect(restaurantProductUpsert).toHaveBeenCalledTimes(24);
    expect(restaurantProductUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/hamburguesa-craft.jpg',
        }),
      }),
    );
    expect(restaurantProductUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/menu-classic-burger.jpg',
        }),
      }),
    );
    expect(restaurantProductUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrl: null,
        }),
      }),
    );

    // 8 menu sections
    expect(menuSectionUpsert).toHaveBeenCalledTimes(8);
    expect(menuItemDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          menuSectionId: {
            in: expect.arrayContaining([
              'section-1',
              'section-2',
              'section-3',
              'section-4',
              'section-5',
              'section-6',
              'section-7',
              'section-8',
            ]),
          },
        },
      }),
    );
    expect(menuItemCreate).toHaveBeenCalled();

    // 7 modifier groups: burger-extras, burger-remove, burger-point, drink-size, coffee-options, platter-remove, platter-extras
    expect(modifierGroupUpsert).toHaveBeenCalledTimes(7);
    expect(modifierOptionUpsert).toHaveBeenCalledTimes(21);

    // burger × 4 products × 3 groups + drink-size × 3 products + coffee × 2 products + platter × 2 products × 2 groups
    expect(restaurantProductModifierGroupUpsert).toHaveBeenCalledTimes(21);

    // 3 combo slots
    expect(comboSlotUpsert).toHaveBeenCalledTimes(3);
    expect(comboSlotOptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ supplementPriceCents: 150 }),
      }),
    );

    expect(platterDefinitionUpsert).toHaveBeenCalledTimes(3);
    expect(platterComponentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ name: 'Huevo', isRemovable: true }),
      }),
    );
  });
});
