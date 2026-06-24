import type { PrismaClient } from '@prisma/client';

const DEMO_ORGANIZATION_NAME = 'MesaFlow Demo';
const DEMO_RESTAURANT_NAME = 'MesaFlow Centro';

type DemoProductDefinition = {
  name: string;
  description?: string;
  productType: 'simple' | 'combo' | 'platter';
  defaultCourse: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
  defaultPreparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  taxName: string;
};

export async function seedMesaFlowDemo(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { name: DEMO_ORGANIZATION_NAME },
    update: {
      legalName: 'MesaFlow Demo S.L.',
      taxId: 'B12345678',
      accountType: 'demo',
    },
    create: {
      name: DEMO_ORGANIZATION_NAME,
      legalName: 'MesaFlow Demo S.L.',
      taxId: 'B12345678',
      accountType: 'demo',
    },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: DEMO_RESTAURANT_NAME,
      },
    },
    update: {
      id: 'restaurant-mesaflow-centro',
      displayName: 'MesaFlow Centro',
      address: 'Calle Mayor 1, Madrid',
      phone: '+34 910 000 000',
      email: 'centro@mesaflow.demo',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      isActive: true,
    },
    create: {
      id: 'restaurant-mesaflow-centro',
      organizationId: organization.id,
      name: DEMO_RESTAURANT_NAME,
      displayName: 'MesaFlow Centro',
      address: 'Calle Mayor 1, Madrid',
      phone: '+34 910 000 000',
      email: 'centro@mesaflow.demo',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      isActive: true,
    },
  });

  const taxRateIdByName = new Map<string, string>();
  for (const taxRate of [
    { name: 'IVA General', ratePercent: '21.00' },
    { name: 'IVA Reducido', ratePercent: '10.00' },
    { name: 'VAT 0%', ratePercent: '0.00' },
  ]) {
    const storedTaxRate = await prisma.taxRate.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: taxRate.name,
        },
      },
      update: {
        ratePercent: taxRate.ratePercent,
        isActive: true,
      },
      create: {
        organizationId: organization.id,
        name: taxRate.name,
        ratePercent: taxRate.ratePercent,
        isActive: true,
      },
    });
    taxRateIdByName.set(taxRate.name, storedTaxRate.id);
  }

  const productIdByName = new Map<string, string>();
  for (const product of demoProducts()) {
    const storedProduct = await prisma.product.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: product.name,
        },
      },
      update: {
        description: product.description ?? null,
        productType: product.productType,
        defaultCourse: product.defaultCourse,
        defaultPreparationRoute: product.defaultPreparationRoute,
        taxRateId: taxRateIdByName.get(product.taxName) ?? null,
        isActive: true,
      },
      create: {
        organizationId: organization.id,
        name: product.name,
        description: product.description ?? null,
        productType: product.productType,
        defaultCourse: product.defaultCourse,
        defaultPreparationRoute: product.defaultPreparationRoute,
        taxRateId: taxRateIdByName.get(product.taxName) ?? null,
        isActive: true,
      },
    });
    productIdByName.set(product.name, storedProduct.id);
  }

  const saleIdByProductName = new Map<string, string>();
  for (const entry of demoRestaurantProducts()) {
    const productId = productIdByName.get(entry.productName);
    if (!productId) throw new Error(`Missing demo product "${entry.productName}".`);

    const sale = await prisma.restaurantProduct.upsert({
      where: {
        restaurantId_productId: {
          restaurantId: restaurant.id,
          productId,
        },
      },
      update: {
        displayName: entry.displayName ?? null,
        displayDescription: entry.displayDescription ?? null,
        priceCents: entry.priceCents,
        currency: restaurant.currency,
        isAvailable: true,
        isVisible: true,
        preparationRouteOverride: entry.preparationRouteOverride ?? null,
        sortOrder: entry.sortOrder,
      },
      create: {
        restaurantId: restaurant.id,
        productId,
        displayName: entry.displayName ?? null,
        displayDescription: entry.displayDescription ?? null,
        priceCents: entry.priceCents,
        currency: restaurant.currency,
        isAvailable: true,
        isVisible: true,
        preparationRouteOverride: entry.preparationRouteOverride ?? null,
        sortOrder: entry.sortOrder,
      },
    });
    saleIdByProductName.set(entry.productName, sale.id);
  }

  const menu = await prisma.restaurantMenu.upsert({
    where: {
      restaurantId_name: {
        restaurantId: restaurant.id,
        name: 'Carta principal',
      },
    },
    update: { isActive: true },
    create: {
      restaurantId: restaurant.id,
      name: 'Carta principal',
      isActive: true,
    },
  });

  const drinksSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Bebidas' } },
    update: { sortOrder: 1, isVisible: true },
    create: { menuId: menu.id, name: 'Bebidas', sortOrder: 1, isVisible: true },
  });
  const startersSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Entrantes' } },
    update: { sortOrder: 2, isVisible: true },
    create: { menuId: menu.id, name: 'Entrantes', sortOrder: 2, isVisible: true },
  });
  const mainsSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Principales' } },
    update: { sortOrder: 3, isVisible: true },
    create: { menuId: menu.id, name: 'Principales', sortOrder: 3, isVisible: true },
  });
  const dessertsSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Postres' } },
    update: { sortOrder: 4, isVisible: true },
    create: { menuId: menu.id, name: 'Postres', sortOrder: 4, isVisible: true },
  });

  for (const item of [
    { sectionId: drinksSection.id, productName: 'Coca-Cola', sortOrder: 1 },
    { sectionId: drinksSection.id, productName: 'Agua mineral', sortOrder: 2 },
    { sectionId: drinksSection.id, productName: 'Cerveza', sortOrder: 3 },
    { sectionId: drinksSection.id, productName: 'Vino tinto copa', sortOrder: 4 },
    { sectionId: drinksSection.id, productName: 'Cafe solo', sortOrder: 5 },
    { sectionId: startersSection.id, productName: 'Croquetas de jamon iberico', sortOrder: 1 },
    { sectionId: startersSection.id, productName: 'Nachos caseros', sortOrder: 2 },
    { sectionId: startersSection.id, productName: 'Ensalada', sortOrder: 3 },
    { sectionId: mainsSection.id, productName: 'Hamburguesa craft', sortOrder: 1 },
    { sectionId: mainsSection.id, productName: 'Sandwich club', sortOrder: 2 },
    { sectionId: mainsSection.id, productName: 'Menu Classic Burger', sortOrder: 3 },
    { sectionId: mainsSection.id, productName: 'Plato combinado vegetal', sortOrder: 4 },
    { sectionId: dessertsSection.id, productName: 'Tarta de queso', sortOrder: 1 },
  ]) {
    const restaurantProductId = saleIdByProductName.get(item.productName);
    if (!restaurantProductId) throw new Error(`Missing restaurant product for "${item.productName}".`);
    await prisma.menuItem.upsert({
      where: {
        menuSectionId_restaurantProductId: {
          menuSectionId: item.sectionId,
          restaurantProductId,
        },
      },
      update: { sortOrder: item.sortOrder, isVisible: true },
      create: {
        menuSectionId: item.sectionId,
        restaurantProductId,
        sortOrder: item.sortOrder,
        isVisible: true,
      },
    });
  }

  const extrasGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Extras' } },
    update: {
      selectionType: 'multiple',
      minSelections: 0,
      maxSelections: 3,
      isRequired: false,
    },
    create: {
      organizationId: organization.id,
      name: 'Extras',
      selectionType: 'multiple',
      minSelections: 0,
      maxSelections: 3,
      isRequired: false,
    },
  });
  const cookingGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Punto de coccion' } },
    update: {
      selectionType: 'single',
      minSelections: 1,
      maxSelections: 1,
      isRequired: true,
    },
    create: {
      organizationId: organization.id,
      name: 'Punto de coccion',
      selectionType: 'single',
      minSelections: 1,
      maxSelections: 1,
      isRequired: true,
    },
  });
  const saucesGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Salsas' } },
    update: {
      selectionType: 'multiple',
      minSelections: 0,
      maxSelections: 2,
      isRequired: false,
    },
    create: {
      organizationId: organization.id,
      name: 'Salsas',
      selectionType: 'multiple',
      minSelections: 0,
      maxSelections: 2,
      isRequired: false,
    },
  });

  for (const option of [
    { groupId: extrasGroup.id, name: 'Queso', priceDeltaCents: 100, sortOrder: 1 },
    { groupId: extrasGroup.id, name: 'Bacon', priceDeltaCents: 150, sortOrder: 2 },
    { groupId: extrasGroup.id, name: 'Huevo', priceDeltaCents: 120, sortOrder: 3 },
    { groupId: cookingGroup.id, name: 'Al punto', priceDeltaCents: 0, sortOrder: 1 },
    { groupId: cookingGroup.id, name: 'Muy hecha', priceDeltaCents: 0, sortOrder: 2 },
    { groupId: saucesGroup.id, name: 'Guacamole', priceDeltaCents: 100, sortOrder: 1 },
    { groupId: saucesGroup.id, name: 'Salsa cheddar', priceDeltaCents: 100, sortOrder: 2 },
  ]) {
    await prisma.modifierOption.upsert({
      where: {
        modifierGroupId_name: {
          modifierGroupId: option.groupId,
          name: option.name,
        },
      },
      update: {
        priceDeltaCents: option.priceDeltaCents,
        isAvailable: true,
        sortOrder: option.sortOrder,
      },
      create: {
        modifierGroupId: option.groupId,
        name: option.name,
        priceDeltaCents: option.priceDeltaCents,
        isAvailable: true,
        sortOrder: option.sortOrder,
      },
    });
  }

  const burgerSaleId = saleIdByProductName.get('Hamburguesa craft');
  if (!burgerSaleId) throw new Error('Missing burger sale.');
  await prisma.restaurantProductModifierGroup.upsert({
    where: {
      restaurantProductId_modifierGroupId: {
        restaurantProductId: burgerSaleId,
        modifierGroupId: extrasGroup.id,
      },
    },
    update: { sortOrder: 1 },
    create: {
      restaurantProductId: burgerSaleId,
      modifierGroupId: extrasGroup.id,
      sortOrder: 1,
    },
  });
  await prisma.restaurantProductModifierGroup.upsert({
    where: {
      restaurantProductId_modifierGroupId: {
        restaurantProductId: burgerSaleId,
        modifierGroupId: cookingGroup.id,
      },
    },
    update: { sortOrder: 2 },
    create: {
      restaurantProductId: burgerSaleId,
      modifierGroupId: cookingGroup.id,
      sortOrder: 2,
    },
  });
  const nachosSaleId = saleIdByProductName.get('Nachos caseros');
  if (!nachosSaleId) throw new Error('Missing nachos sale.');
  await prisma.restaurantProductModifierGroup.upsert({
    where: {
      restaurantProductId_modifierGroupId: {
        restaurantProductId: nachosSaleId,
        modifierGroupId: saucesGroup.id,
      },
    },
    update: { sortOrder: 1 },
    create: {
      restaurantProductId: nachosSaleId,
      modifierGroupId: saucesGroup.id,
      sortOrder: 1,
    },
  });

  const comboProductId = productIdByName.get('Menu Classic Burger');
  if (!comboProductId) throw new Error('Missing combo product.');
  const comboDefinition = await prisma.comboDefinition.upsert({
    where: { productId: comboProductId },
    update: {
      pricingMode: 'base_plus_supplements',
      basePriceCents: 1390,
    },
    create: {
      productId: comboProductId,
      pricingMode: 'base_plus_supplements',
      basePriceCents: 1390,
    },
  });
  const comboDrinkSlot = await prisma.comboSlot.upsert({
    where: {
      comboDefinitionId_name: {
        comboDefinitionId: comboDefinition.id,
        name: 'Bebida',
      },
    },
    update: {
      minSelections: 1,
      maxSelections: 1,
      isRequired: true,
      sortOrder: 1,
    },
    create: {
      comboDefinitionId: comboDefinition.id,
      name: 'Bebida',
      minSelections: 1,
      maxSelections: 1,
      isRequired: true,
      sortOrder: 1,
    },
  });
  const comboSideSlot = await prisma.comboSlot.upsert({
    where: {
      comboDefinitionId_name: {
        comboDefinitionId: comboDefinition.id,
        name: 'Acompanamiento',
      },
    },
    update: {
      minSelections: 1,
      maxSelections: 1,
      isRequired: true,
      sortOrder: 2,
    },
    create: {
      comboDefinitionId: comboDefinition.id,
      name: 'Acompanamiento',
      minSelections: 1,
      maxSelections: 1,
      isRequired: true,
      sortOrder: 2,
    },
  });

  for (const option of [
    { productName: 'Agua mineral', supplementPriceCents: 0, sortOrder: 1, isDefault: true },
    { productName: 'Coca-Cola', supplementPriceCents: 0, sortOrder: 2, isDefault: false },
    { productName: 'Cerveza', supplementPriceCents: 150, sortOrder: 3, isDefault: false },
  ]) {
    const restaurantProductId = saleIdByProductName.get(option.productName);
    if (!restaurantProductId) throw new Error(`Missing combo option sale for "${option.productName}".`);
    await prisma.comboSlotOption.upsert({
      where: {
        comboSlotId_restaurantProductId: {
          comboSlotId: comboDrinkSlot.id,
          restaurantProductId,
        },
      },
      update: {
        supplementPriceCents: option.supplementPriceCents,
        isDefault: option.isDefault,
        isAvailable: true,
        sortOrder: option.sortOrder,
      },
      create: {
        comboSlotId: comboDrinkSlot.id,
        restaurantProductId,
        supplementPriceCents: option.supplementPriceCents,
        isDefault: option.isDefault,
        isAvailable: true,
        sortOrder: option.sortOrder,
      },
    });
  }
  for (const option of [
    { productName: 'Patatas fritas', supplementPriceCents: 0, sortOrder: 1, isDefault: true },
    { productName: 'Ensalada', supplementPriceCents: 50, sortOrder: 2, isDefault: false },
  ]) {
    const restaurantProductId = saleIdByProductName.get(option.productName);
    if (!restaurantProductId) {
      throw new Error(`Missing combo side sale for "${option.productName}".`);
    }
    await prisma.comboSlotOption.upsert({
      where: {
        comboSlotId_restaurantProductId: {
          comboSlotId: comboSideSlot.id,
          restaurantProductId,
        },
      },
      update: {
        supplementPriceCents: option.supplementPriceCents,
        isDefault: option.isDefault,
        isAvailable: true,
        sortOrder: option.sortOrder,
      },
      create: {
        comboSlotId: comboSideSlot.id,
        restaurantProductId,
        supplementPriceCents: option.supplementPriceCents,
        isDefault: option.isDefault,
        isAvailable: true,
        sortOrder: option.sortOrder,
      },
    });
  }

  const platterProductId = productIdByName.get('Plato combinado vegetal');
  if (!platterProductId) throw new Error('Missing platter product.');
  const platterDefinition = await prisma.platterDefinition.upsert({
    where: { productId: platterProductId },
    update: {},
    create: { productId: platterProductId },
  });
  for (const component of [
    { name: 'Huevo', productName: undefined, quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 1 },
    {
      name: 'Patatas fritas',
      productName: 'Patatas fritas',
      quantity: 1,
      isRemovable: false,
      isReplaceable: false,
      sortOrder: 2,
    },
    { name: 'Ensalada', productName: 'Ensalada', quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 3 },
  ]) {
    await prisma.platterComponent.upsert({
      where: {
        platterDefinitionId_sortOrder: {
          platterDefinitionId: platterDefinition.id,
          sortOrder: component.sortOrder,
        },
      },
      update: {
        componentProductId: component.productName ? (productIdByName.get(component.productName) ?? null) : null,
        name: component.name,
        quantity: component.quantity,
        isRemovable: component.isRemovable,
        isReplaceable: component.isReplaceable,
      },
      create: {
        platterDefinitionId: platterDefinition.id,
        componentProductId: component.productName ? (productIdByName.get(component.productName) ?? null) : null,
        name: component.name,
        quantity: component.quantity,
        isRemovable: component.isRemovable,
        isReplaceable: component.isReplaceable,
        sortOrder: component.sortOrder,
      },
    });
  }
}

function demoProducts(): DemoProductDefinition[] {
  return [
    {
      name: 'Coca-Cola',
      productType: 'simple',
      defaultCourse: 'drinks',
      defaultPreparationRoute: 'bar',
      taxName: 'IVA General',
    },
    {
      name: 'Agua mineral',
      productType: 'simple',
      defaultCourse: 'drinks',
      defaultPreparationRoute: 'direct',
      taxName: 'VAT 0%',
    },
    {
      name: 'Cerveza',
      productType: 'simple',
      defaultCourse: 'drinks',
      defaultPreparationRoute: 'bar',
      taxName: 'IVA General',
    },
    {
      name: 'Vino tinto copa',
      productType: 'simple',
      defaultCourse: 'drinks',
      defaultPreparationRoute: 'bar',
      taxName: 'IVA General',
    },
    {
      name: 'Cafe solo',
      productType: 'simple',
      defaultCourse: 'dessert',
      defaultPreparationRoute: 'bar',
      taxName: 'IVA Reducido',
    },
    {
      name: 'Hamburguesa craft',
      description: 'Hamburguesa premium con pan brioche.',
      productType: 'simple',
      defaultCourse: 'main',
      defaultPreparationRoute: 'kitchen',
      taxName: 'IVA General',
    },
    {
      name: 'Croquetas de jamon iberico',
      productType: 'simple',
      defaultCourse: 'starter',
      defaultPreparationRoute: 'kitchen',
      taxName: 'IVA Reducido',
    },
    {
      name: 'Nachos caseros',
      description: 'Totopos con cheddar y pico de gallo.',
      productType: 'simple',
      defaultCourse: 'starter',
      defaultPreparationRoute: 'kitchen',
      taxName: 'IVA Reducido',
    },
    {
      name: 'Menu Classic Burger',
      productType: 'combo',
      defaultCourse: 'main',
      defaultPreparationRoute: 'kitchen',
      taxName: 'IVA General',
    },
    {
      name: 'Sandwich club',
      productType: 'simple',
      defaultCourse: 'main',
      defaultPreparationRoute: 'kitchen',
      taxName: 'IVA Reducido',
    },
    {
      name: 'Plato combinado vegetal',
      productType: 'platter',
      defaultCourse: 'main',
      defaultPreparationRoute: 'kitchen',
      taxName: 'IVA General',
    },
    {
      name: 'Patatas fritas',
      productType: 'simple',
      defaultCourse: 'other',
      defaultPreparationRoute: 'kitchen',
      taxName: 'IVA General',
    },
    {
      name: 'Ensalada',
      productType: 'simple',
      defaultCourse: 'starter',
      defaultPreparationRoute: 'cold_station',
      taxName: 'IVA Reducido',
    },
    {
      name: 'Tarta de queso',
      productType: 'simple',
      defaultCourse: 'dessert',
      defaultPreparationRoute: 'dessert_station',
      taxName: 'IVA Reducido',
    },
  ];
}

function demoRestaurantProducts(): Array<{
  productName: string;
  displayName?: string;
  displayDescription?: string;
  priceCents: number;
  preparationRouteOverride?: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  sortOrder: number;
}> {
  return [
    { productName: 'Coca-Cola', priceCents: 300, sortOrder: 1 },
    { productName: 'Agua mineral', priceCents: 250, sortOrder: 2 },
    { productName: 'Cerveza', priceCents: 350, sortOrder: 3 },
    { productName: 'Vino tinto copa', priceCents: 420, sortOrder: 4 },
    { productName: 'Cafe solo', priceCents: 180, sortOrder: 5 },
    { productName: 'Hamburguesa craft', priceCents: 1250, sortOrder: 6 },
    { productName: 'Croquetas de jamon iberico', priceCents: 980, sortOrder: 7 },
    { productName: 'Nachos caseros', priceCents: 890, sortOrder: 8 },
    { productName: 'Menu Classic Burger', priceCents: 1390, sortOrder: 9 },
    { productName: 'Sandwich club', priceCents: 1090, sortOrder: 10 },
    { productName: 'Plato combinado vegetal', priceCents: 1190, sortOrder: 11 },
    { productName: 'Patatas fritas', priceCents: 400, sortOrder: 12 },
    { productName: 'Ensalada', priceCents: 450, sortOrder: 13 },
    { productName: 'Tarta de queso', priceCents: 520, sortOrder: 14 },
  ];
}

export const MESAFLOW_DEMO_ORGANIZATION_NAME = DEMO_ORGANIZATION_NAME;
export const MESAFLOW_DEMO_RESTAURANT_NAME = DEMO_RESTAURANT_NAME;
