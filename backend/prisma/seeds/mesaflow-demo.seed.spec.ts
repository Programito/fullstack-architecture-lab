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
    const menuSectionUpdate = vi.fn().mockResolvedValue(undefined);
    const menuItemDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const menuItemCreate = vi.fn().mockResolvedValue(undefined);
    const modifierGroupUpsert = vi.fn().mockImplementation(async () => ({ id: `group-${++modifierGroupSeq}` }));
    const modifierGroupUpdate = vi.fn().mockResolvedValue(undefined);
    const modifierOptionUpsert = vi.fn().mockResolvedValue(undefined);
    const restaurantProductModifierGroupUpsert = vi.fn().mockResolvedValue(undefined);
    const comboDefinitionUpsert = vi.fn().mockResolvedValue({ id: 'combo-definition' });
    const comboSlotUpsert = vi.fn().mockImplementation(async () => ({ id: `combo-slot-${++comboSlotSeq}` }));
    const comboSlotOptionDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const comboSlotOptionCreateMany = vi.fn().mockResolvedValue({ count: 0 });
    const platterDefinitionUpsert = vi.fn().mockResolvedValue({ id: 'platter-definition' });
    const platterComponentUpsert = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      organization: { upsert: organizationUpsert },
      restaurant: { upsert: restaurantUpsert },
      taxRate: { upsert: taxRateUpsert },
      product: { upsert: productUpsert },
      restaurantProduct: { upsert: restaurantProductUpsert },
      restaurantMenu: { upsert: restaurantMenuUpsert },
      menuSection: { upsert: menuSectionUpsert, update: menuSectionUpdate },
      menuItem: { deleteMany: menuItemDeleteMany, create: menuItemCreate },
      modifierGroup: { upsert: modifierGroupUpsert, update: modifierGroupUpdate },
      modifierOption: { upsert: modifierOptionUpsert },
      restaurantProductModifierGroup: { upsert: restaurantProductModifierGroupUpsert },
      comboDefinition: { upsert: comboDefinitionUpsert },
      comboSlot: { upsert: comboSlotUpsert },
      comboSlotOption: { deleteMany: comboSlotOptionDeleteMany, createMany: comboSlotOptionCreateMany },
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
    expect(productUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_name: { organizationId: 'org-demo', name: 'Hamburguesa craft' } },
        create: expect.objectContaining({ allergens: ['gluten', 'eggs', 'milk', 'mustard'] }),
        update: expect.objectContaining({ allergens: ['gluten', 'eggs', 'milk', 'mustard'] }),
      }),
    );
    expect(productUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_name: { organizationId: 'org-demo', name: 'Agua mineral' } },
        create: expect.objectContaining({ allergens: [] }),
        update: expect.objectContaining({ allergens: [] }),
      }),
    );
    expect(restaurantProductUpsert).toHaveBeenCalledTimes(24);
    expect(restaurantProductUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrl:
            'https://res.cloudinary.com/dcveottyl/image/upload/v1783953592/restaurants/restaurant-mesaflow-centro/products/f0y9imzeuxg1plahzxrq.png',
        }),
      }),
    );
    expect(restaurantProductUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrl:
            'https://res.cloudinary.com/dcveottyl/image/upload/v1783955513/restaurants/restaurant-mesaflow-centro/products/djwly9xwte1bv1gwvibc.png',
        }),
      }),
    );
    expect(restaurantProductUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          imageUrl:
            'https://res.cloudinary.com/dcveottyl/image/upload/v1783954747/restaurants/restaurant-mesaflow-centro/products/zom194mygzyz75xukfc4.png',
        }),
      }),
    );

    // 8 menu sections
    expect(menuSectionUpsert).toHaveBeenCalledTimes(8);
    expect(menuSectionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { menuId_name: { menuId: 'menu-main', name: 'Bebidas' } },
        update: expect.objectContaining({
          nameI18n: { es: 'Bebidas', ca: 'Begudes', en: 'Drinks' },
        }),
        create: expect.objectContaining({
          nameI18n: { es: 'Bebidas', ca: 'Begudes', en: 'Drinks' },
        }),
      }),
    );
    expect(menuSectionUpdate).toHaveBeenCalledTimes(8);
    expect(menuSectionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'section-1' },
        data: { nameI18n: { es: 'Bebidas', ca: 'Begudes', en: 'Drinks' } },
      }),
    );
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
    expect(modifierGroupUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_name: { organizationId: 'org-demo', name: 'Extras de hamburguesa' } },
        update: expect.objectContaining({
          nameI18n: { es: 'Extras de hamburguesa', ca: "Extres d'hamburguesa", en: 'Burger extras' },
        }),
        create: expect.objectContaining({
          nameI18n: { es: 'Extras de hamburguesa', ca: "Extres d'hamburguesa", en: 'Burger extras' },
        }),
      }),
    );
    expect(modifierGroupUpdate).toHaveBeenCalledTimes(7);
    expect(modifierGroupUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group-4' },
        data: { nameI18n: { es: 'Tamaño de bebida', ca: 'Mida de beguda', en: 'Drink size' } },
      }),
    );
    expect(modifierOptionUpsert).toHaveBeenCalledTimes(21);
    expect(modifierOptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { modifierGroupId_name: { modifierGroupId: 'group-4', name: 'Mediana' } },
        update: expect.objectContaining({
          nameI18n: { es: 'Mediana', ca: 'Mitjana', en: 'Medium' },
        }),
        create: expect.objectContaining({
          nameI18n: { es: 'Mediana', ca: 'Mitjana', en: 'Medium' },
        }),
      }),
    );

    // burger × 4 products × 3 groups + drink-size × 3 products + coffee × 2 products + platter × 2 products × 2 groups
    expect(restaurantProductModifierGroupUpsert).toHaveBeenCalledTimes(21);

    // 3 combo slots
    expect(comboSlotUpsert).toHaveBeenCalledTimes(3);
    expect(comboSlotOptionDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { comboSlotId: { in: ['combo-slot-1', 'combo-slot-2', 'combo-slot-3'] } },
      }),
    );
    expect(comboSlotOptionCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ supplementPriceCents: 150 })]),
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
