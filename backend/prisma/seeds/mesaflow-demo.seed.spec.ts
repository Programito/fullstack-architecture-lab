import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { seedMesaFlowDemo } from './mesaflow-demo.seed';

describe('seedMesaFlowDemo', () => {
  it('creates the demo organization, restaurant, taxes, catalog, menu, modifiers, combo and platter data idempotently', async () => {
    const organizationUpsert = vi.fn().mockResolvedValue({ id: 'org-demo' });
    const restaurantUpsert = vi.fn().mockResolvedValue({ id: 'rest-demo', organizationId: 'org-demo' });
    const taxRateUpsert = vi.fn().mockResolvedValue({ id: 'tax-general' });
    const productUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'product-coke' })
      .mockResolvedValueOnce({ id: 'product-water' })
      .mockResolvedValueOnce({ id: 'product-beer' })
      .mockResolvedValueOnce({ id: 'product-wine' })
      .mockResolvedValueOnce({ id: 'product-coffee' })
      .mockResolvedValueOnce({ id: 'product-burger' })
      .mockResolvedValueOnce({ id: 'product-croquetas' })
      .mockResolvedValueOnce({ id: 'product-nachos' })
      .mockResolvedValueOnce({ id: 'product-combo' })
      .mockResolvedValueOnce({ id: 'product-sandwich' })
      .mockResolvedValueOnce({ id: 'product-platter' })
      .mockResolvedValueOnce({ id: 'product-fries' })
      .mockResolvedValueOnce({ id: 'product-salad' })
      .mockResolvedValueOnce({ id: 'product-cheesecake' });
    const restaurantProductUpsert = vi
      .fn()
      .mockImplementation(async ({ where }: { where: { restaurantId_productId: { productId: string } } }) => ({
        id: `sale-${where.restaurantId_productId.productId}`,
      }));
    const restaurantMenuUpsert = vi.fn().mockResolvedValue({ id: 'menu-main' });
    const menuSectionUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'section-drinks' })
      .mockResolvedValueOnce({ id: 'section-starters' })
      .mockResolvedValueOnce({ id: 'section-mains' })
      .mockResolvedValueOnce({ id: 'section-desserts' });
    const menuItemUpsert = vi.fn().mockResolvedValue(undefined);
    const modifierGroupUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'group-extras' })
      .mockResolvedValueOnce({ id: 'group-cooking' })
      .mockResolvedValueOnce({ id: 'group-sauces' });
    const modifierOptionUpsert = vi.fn().mockResolvedValue(undefined);
    const restaurantProductModifierGroupUpsert = vi.fn().mockResolvedValue(undefined);
    const comboDefinitionUpsert = vi.fn().mockResolvedValue({ id: 'combo-definition' });
    const comboSlotUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'combo-slot-drink' })
      .mockResolvedValueOnce({ id: 'combo-slot-side' });
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
      menuItem: { upsert: menuItemUpsert },
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
      expect.objectContaining({
        where: { name: 'MesaFlow Demo' },
      }),
    );
    expect(restaurantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_name: { organizationId: 'org-demo', name: 'MesaFlow Centro' } },
      }),
    );
    expect(taxRateUpsert).toHaveBeenCalledTimes(3);
    expect(productUpsert).toHaveBeenCalledTimes(14);
    expect(restaurantProductUpsert).toHaveBeenCalledTimes(14);
    expect(menuItemUpsert).toHaveBeenCalled();
    expect(restaurantProductModifierGroupUpsert).toHaveBeenCalledTimes(3);
    expect(comboSlotOptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          supplementPriceCents: 150,
        }),
      }),
    );
    expect(comboSlotOptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          supplementPriceCents: 50,
        }),
      }),
    );
    expect(platterComponentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          name: 'Huevo',
          isRemovable: true,
        }),
      }),
    );
  });
});
