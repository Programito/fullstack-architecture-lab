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
        imageUrl: entry.imageUrl ?? null,
        priceCents: entry.priceCents,
        currency: restaurant.currency,
        isAvailable: entry.isAvailable ?? true,
        isVisible: true,
        preparationRouteOverride: entry.preparationRouteOverride ?? null,
        sortOrder: entry.sortOrder,
      },
      create: {
        restaurantId: restaurant.id,
        productId,
        displayName: entry.displayName ?? null,
        displayDescription: entry.displayDescription ?? null,
        imageUrl: entry.imageUrl ?? null,
        priceCents: entry.priceCents,
        currency: restaurant.currency,
        isAvailable: entry.isAvailable ?? true,
        isVisible: true,
        preparationRouteOverride: entry.preparationRouteOverride ?? null,
        sortOrder: entry.sortOrder,
      },
    });
    saleIdByProductName.set(entry.productName, sale.id);
  }

  // ── Menu sections ────────────────────────────────────────────────────────────

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
  const tapasSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Tapas' } },
    update: { sortOrder: 2, isVisible: true },
    create: { menuId: menu.id, name: 'Tapas', sortOrder: 2, isVisible: true },
  });
  const burgersSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Hamburguesas' } },
    update: { sortOrder: 3, isVisible: true },
    create: { menuId: menu.id, name: 'Hamburguesas', sortOrder: 3, isVisible: true },
  });
  const saladsSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Ensaladas' } },
    update: { sortOrder: 4, isVisible: true },
    create: { menuId: menu.id, name: 'Ensaladas', sortOrder: 4, isVisible: true },
  });
  const plattersSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Platos combinados' } },
    update: { sortOrder: 5, isVisible: true },
    create: { menuId: menu.id, name: 'Platos combinados', sortOrder: 5, isVisible: true },
  });
  const dessertsSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Postres' } },
    update: { sortOrder: 6, isVisible: true },
    create: { menuId: menu.id, name: 'Postres', sortOrder: 6, isVisible: true },
  });
  const coffeeSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Café' } },
    update: { sortOrder: 7, isVisible: true },
    create: { menuId: menu.id, name: 'Café', sortOrder: 7, isVisible: true },
  });
  const menusSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Menús' } },
    update: { sortOrder: 8, isVisible: true },
    create: { menuId: menu.id, name: 'Menús', sortOrder: 8, isVisible: true },
  });

  const menuItems = [
    { sectionId: drinksSection.id, productName: 'Coca-Cola', sortOrder: 1 },
    { sectionId: drinksSection.id, productName: 'Agua mineral', sortOrder: 2 },
    { sectionId: drinksSection.id, productName: 'Cerveza', sortOrder: 3 },
    { sectionId: drinksSection.id, productName: 'Limonada con gas', sortOrder: 4 },
    { sectionId: drinksSection.id, productName: 'Vino tinto copa', sortOrder: 5 },
    { sectionId: tapasSection.id, productName: 'Croquetas de jamon iberico', sortOrder: 1 },
    { sectionId: tapasSection.id, productName: 'Patatas bravas', sortOrder: 2 },
    { sectionId: tapasSection.id, productName: 'Nachos caseros', sortOrder: 3 },
    { sectionId: tapasSection.id, productName: 'Patatas fritas', sortOrder: 4 },
    { sectionId: burgersSection.id, productName: 'Hamburguesa craft', sortOrder: 1 },
    { sectionId: burgersSection.id, productName: 'Hamburguesa clasica', sortOrder: 2 },
    { sectionId: burgersSection.id, productName: 'Hamburguesa trufada', sortOrder: 3 },
    { sectionId: burgersSection.id, productName: 'Hamburguesa vegetal', sortOrder: 4 },
    { sectionId: saladsSection.id, productName: 'Ensalada cesar', sortOrder: 1 },
    { sectionId: saladsSection.id, productName: 'Ensalada', sortOrder: 2 },
    { sectionId: plattersSection.id, productName: 'Plato combinado de lomo', sortOrder: 1 },
    { sectionId: plattersSection.id, productName: 'Plato combinado de pollo', sortOrder: 2 },
    { sectionId: plattersSection.id, productName: 'Plato combinado vegetal', sortOrder: 3 },
    { sectionId: dessertsSection.id, productName: 'Tarta de queso', sortOrder: 1 },
    { sectionId: dessertsSection.id, productName: 'Coulant de chocolate', sortOrder: 2 },
    { sectionId: coffeeSection.id, productName: 'Cafe solo', sortOrder: 1 },
    { sectionId: coffeeSection.id, productName: 'Cafe con leche', sortOrder: 2 },
    { sectionId: menusSection.id, productName: 'Menu Classic Burger', sortOrder: 1 },
  ];

  await prisma.menuItem.deleteMany({
    where: {
      menuSectionId: {
        in: [...new Set(menuItems.map((item) => item.sectionId))],
      },
    },
  });

  for (const item of menuItems) {
    const restaurantProductId = saleIdByProductName.get(item.productName);
    if (!restaurantProductId) throw new Error(`Missing restaurant product for "${item.productName}".`);
    await prisma.menuItem.create({
      data: {
        menuSectionId: item.sectionId,
        restaurantProductId,
        sortOrder: item.sortOrder,
        isVisible: true,
      },
    });
  }

  // ── Modifier groups ──────────────────────────────────────────────────────────

  const burgerExtrasGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Extras de hamburguesa' } },
    update: { selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
    create: { organizationId: organization.id, name: 'Extras de hamburguesa', selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
  });
  const burgerRemoveGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Quitar ingredientes hamburguesa' } },
    update: { selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
    create: { organizationId: organization.id, name: 'Quitar ingredientes hamburguesa', selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
  });
  const burgerPointGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Punto de la carne' } },
    update: { selectionType: 'single', minSelections: 1, maxSelections: 1, isRequired: true },
    create: { organizationId: organization.id, name: 'Punto de la carne', selectionType: 'single', minSelections: 1, maxSelections: 1, isRequired: true },
  });
  const drinkSizeGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Tamaño de bebida' } },
    update: { selectionType: 'single', minSelections: 1, maxSelections: 1, isRequired: true },
    create: { organizationId: organization.id, name: 'Tamaño de bebida', selectionType: 'single', minSelections: 1, maxSelections: 1, isRequired: true },
  });
  const coffeeOptionsGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Opciones de café' } },
    update: { selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
    create: { organizationId: organization.id, name: 'Opciones de café', selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
  });
  const platterRemoveGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Quitar ingredientes plato' } },
    update: { selectionType: 'multiple', minSelections: 0, maxSelections: 4, isRequired: false },
    create: { organizationId: organization.id, name: 'Quitar ingredientes plato', selectionType: 'multiple', minSelections: 0, maxSelections: 4, isRequired: false },
  });
  const platterExtrasGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Extras de plato combinado' } },
    update: { selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
    create: { organizationId: organization.id, name: 'Extras de plato combinado', selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
  });

  // ── Modifier options ─────────────────────────────────────────────────────────

  for (const option of [
    { groupId: burgerExtrasGroup.id, name: 'Bacon', priceDeltaCents: 150, sortOrder: 1 },
    { groupId: burgerExtrasGroup.id, name: 'Queso extra', priceDeltaCents: 100, sortOrder: 2 },
    { groupId: burgerExtrasGroup.id, name: 'Huevo', priceDeltaCents: 120, sortOrder: 3 },
    { groupId: burgerRemoveGroup.id, name: 'Sin cebolla', priceDeltaCents: 0, sortOrder: 1 },
    { groupId: burgerRemoveGroup.id, name: 'Sin pepinillos', priceDeltaCents: 0, sortOrder: 2 },
    { groupId: burgerRemoveGroup.id, name: 'Sin salsa', priceDeltaCents: 0, sortOrder: 3 },
    { groupId: burgerPointGroup.id, name: 'Poco hecha', priceDeltaCents: 0, sortOrder: 1 },
    { groupId: burgerPointGroup.id, name: 'Al punto', priceDeltaCents: 0, sortOrder: 2 },
    { groupId: burgerPointGroup.id, name: 'Muy hecha', priceDeltaCents: 0, sortOrder: 3 },
    { groupId: drinkSizeGroup.id, name: 'Mediana', priceDeltaCents: 0, sortOrder: 1 },
    { groupId: drinkSizeGroup.id, name: 'Grande', priceDeltaCents: 80, sortOrder: 2 },
    { groupId: drinkSizeGroup.id, name: 'XL', priceDeltaCents: 120, sortOrder: 3 },
    { groupId: coffeeOptionsGroup.id, name: 'Carga extra', priceDeltaCents: 70, sortOrder: 1 },
    { groupId: coffeeOptionsGroup.id, name: 'Bebida de avena', priceDeltaCents: 50, sortOrder: 2 },
    { groupId: coffeeOptionsGroup.id, name: 'Descafeinado', priceDeltaCents: 0, sortOrder: 3 },
    { groupId: platterRemoveGroup.id, name: 'Sin huevo', priceDeltaCents: 0, sortOrder: 1 },
    { groupId: platterRemoveGroup.id, name: 'Sin patatas', priceDeltaCents: 0, sortOrder: 2 },
    { groupId: platterRemoveGroup.id, name: 'Sin ensalada', priceDeltaCents: 0, sortOrder: 3 },
    { groupId: platterExtrasGroup.id, name: 'Huevo extra', priceDeltaCents: 120, sortOrder: 1 },
    { groupId: platterExtrasGroup.id, name: 'Patatas extra', priceDeltaCents: 150, sortOrder: 2 },
    { groupId: platterExtrasGroup.id, name: 'Salsa extra', priceDeltaCents: 80, sortOrder: 3 },
  ]) {
    await prisma.modifierOption.upsert({
      where: { modifierGroupId_name: { modifierGroupId: option.groupId, name: option.name } },
      update: { priceDeltaCents: option.priceDeltaCents, isAvailable: true, sortOrder: option.sortOrder },
      create: { modifierGroupId: option.groupId, name: option.name, priceDeltaCents: option.priceDeltaCents, isAvailable: true, sortOrder: option.sortOrder },
    });
  }

  // ── Assign modifier groups to products ───────────────────────────────────────

  for (const { productName, groupId, sortOrder } of [
    { productName: 'Hamburguesa craft', groupId: burgerExtrasGroup.id, sortOrder: 1 },
    { productName: 'Hamburguesa craft', groupId: burgerRemoveGroup.id, sortOrder: 2 },
    { productName: 'Hamburguesa craft', groupId: burgerPointGroup.id, sortOrder: 3 },
    { productName: 'Hamburguesa clasica', groupId: burgerExtrasGroup.id, sortOrder: 1 },
    { productName: 'Hamburguesa clasica', groupId: burgerRemoveGroup.id, sortOrder: 2 },
    { productName: 'Hamburguesa clasica', groupId: burgerPointGroup.id, sortOrder: 3 },
    { productName: 'Hamburguesa trufada', groupId: burgerExtrasGroup.id, sortOrder: 1 },
    { productName: 'Hamburguesa trufada', groupId: burgerRemoveGroup.id, sortOrder: 2 },
    { productName: 'Hamburguesa trufada', groupId: burgerPointGroup.id, sortOrder: 3 },
    { productName: 'Hamburguesa vegetal', groupId: burgerExtrasGroup.id, sortOrder: 1 },
    { productName: 'Hamburguesa vegetal', groupId: burgerRemoveGroup.id, sortOrder: 2 },
    { productName: 'Hamburguesa vegetal', groupId: burgerPointGroup.id, sortOrder: 3 },
    { productName: 'Coca-Cola', groupId: drinkSizeGroup.id, sortOrder: 1 },
    { productName: 'Cerveza', groupId: drinkSizeGroup.id, sortOrder: 1 },
    { productName: 'Limonada con gas', groupId: drinkSizeGroup.id, sortOrder: 1 },
    { productName: 'Cafe solo', groupId: coffeeOptionsGroup.id, sortOrder: 1 },
    { productName: 'Cafe con leche', groupId: coffeeOptionsGroup.id, sortOrder: 1 },
    { productName: 'Plato combinado de lomo', groupId: platterRemoveGroup.id, sortOrder: 1 },
    { productName: 'Plato combinado de lomo', groupId: platterExtrasGroup.id, sortOrder: 2 },
    { productName: 'Plato combinado de pollo', groupId: platterRemoveGroup.id, sortOrder: 1 },
    { productName: 'Plato combinado de pollo', groupId: platterExtrasGroup.id, sortOrder: 2 },
  ]) {
    const restaurantProductId = saleIdByProductName.get(productName);
    if (!restaurantProductId) throw new Error(`Missing restaurant product for modifier group assignment: "${productName}".`);
    await prisma.restaurantProductModifierGroup.upsert({
      where: { restaurantProductId_modifierGroupId: { restaurantProductId, modifierGroupId: groupId } },
      update: { sortOrder },
      create: { restaurantProductId, modifierGroupId: groupId, sortOrder },
    });
  }

  // ── Combo: Menu Classic Burger ───────────────────────────────────────────────

  const comboProductId = productIdByName.get('Menu Classic Burger');
  if (!comboProductId) throw new Error('Missing combo product.');
  const comboDefinition = await prisma.comboDefinition.upsert({
    where: { productId: comboProductId },
    update: { pricingMode: 'base_plus_supplements', basePriceCents: 1390 },
    create: { productId: comboProductId, pricingMode: 'base_plus_supplements', basePriceCents: 1390 },
  });
  const comboBurgerSlot = await prisma.comboSlot.upsert({
    where: { comboDefinitionId_name: { comboDefinitionId: comboDefinition.id, name: 'Hamburguesa' } },
    update: { minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 1 },
    create: { comboDefinitionId: comboDefinition.id, name: 'Hamburguesa', minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 1 },
  });
  const comboDrinkSlot = await prisma.comboSlot.upsert({
    where: { comboDefinitionId_name: { comboDefinitionId: comboDefinition.id, name: 'Bebida' } },
    update: { minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 2 },
    create: { comboDefinitionId: comboDefinition.id, name: 'Bebida', minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 2 },
  });
  const comboSideSlot = await prisma.comboSlot.upsert({
    where: { comboDefinitionId_name: { comboDefinitionId: comboDefinition.id, name: 'Acompañamiento' } },
    update: { minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 3 },
    create: { comboDefinitionId: comboDefinition.id, name: 'Acompañamiento', minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 3 },
  });

  for (const opt of [
    { slotId: comboBurgerSlot.id, productName: 'Hamburguesa clasica', supplementPriceCents: 0, isDefault: true, sortOrder: 1 },
    { slotId: comboBurgerSlot.id, productName: 'Hamburguesa craft', supplementPriceCents: 100, isDefault: false, sortOrder: 2 },
    { slotId: comboBurgerSlot.id, productName: 'Hamburguesa vegetal', supplementPriceCents: 50, isDefault: false, sortOrder: 3 },
    { slotId: comboDrinkSlot.id, productName: 'Agua mineral', supplementPriceCents: 0, isDefault: true, sortOrder: 1 },
    { slotId: comboDrinkSlot.id, productName: 'Coca-Cola', supplementPriceCents: 0, isDefault: false, sortOrder: 2 },
    { slotId: comboDrinkSlot.id, productName: 'Cerveza', supplementPriceCents: 150, isDefault: false, sortOrder: 3 },
    { slotId: comboSideSlot.id, productName: 'Patatas fritas', supplementPriceCents: 0, isDefault: true, sortOrder: 1 },
    { slotId: comboSideSlot.id, productName: 'Ensalada', supplementPriceCents: 50, isDefault: false, sortOrder: 2 },
  ]) {
    const restaurantProductId = saleIdByProductName.get(opt.productName);
    if (!restaurantProductId) throw new Error(`Missing combo slot option product "${opt.productName}".`);
    await prisma.comboSlotOption.upsert({
      where: { comboSlotId_restaurantProductId: { comboSlotId: opt.slotId, restaurantProductId } },
      update: { supplementPriceCents: opt.supplementPriceCents, isDefault: opt.isDefault, isAvailable: true, sortOrder: opt.sortOrder },
      create: { comboSlotId: opt.slotId, restaurantProductId, supplementPriceCents: opt.supplementPriceCents, isDefault: opt.isDefault, isAvailable: true, sortOrder: opt.sortOrder },
    });
  }

  // ── Platters ─────────────────────────────────────────────────────────────────

  for (const platter of [
    {
      productName: 'Plato combinado de lomo',
      components: [
        { name: 'Lomo', productName: undefined, quantity: 1, isRemovable: false, isReplaceable: false, sortOrder: 1 },
        { name: 'Huevo', productName: undefined, quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 2 },
        { name: 'Patatas fritas', productName: 'Patatas fritas', quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 3 },
        { name: 'Ensalada', productName: 'Ensalada', quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 4 },
      ],
    },
    {
      productName: 'Plato combinado de pollo',
      components: [
        { name: 'Pollo', productName: undefined, quantity: 1, isRemovable: false, isReplaceable: false, sortOrder: 1 },
        { name: 'Huevo', productName: undefined, quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 2 },
        { name: 'Patatas fritas', productName: 'Patatas fritas', quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 3 },
        { name: 'Ensalada', productName: 'Ensalada', quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 4 },
      ],
    },
    {
      productName: 'Plato combinado vegetal',
      components: [
        { name: 'Huevo', productName: undefined, quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 1 },
        { name: 'Patatas fritas', productName: 'Patatas fritas', quantity: 1, isRemovable: false, isReplaceable: false, sortOrder: 2 },
        { name: 'Ensalada', productName: 'Ensalada', quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 3 },
        { name: 'Verduras de temporada', productName: undefined, quantity: 1, isRemovable: true, isReplaceable: false, sortOrder: 4 },
      ],
    },
  ]) {
    const platterProductId = productIdByName.get(platter.productName);
    if (!platterProductId) throw new Error(`Missing platter product "${platter.productName}".`);
    const platterDef = await prisma.platterDefinition.upsert({
      where: { productId: platterProductId },
      update: {},
      create: { productId: platterProductId },
    });
    for (const comp of platter.components) {
      const componentProductId = comp.productName ? (productIdByName.get(comp.productName) ?? null) : null;
      await prisma.platterComponent.upsert({
        where: { platterDefinitionId_sortOrder: { platterDefinitionId: platterDef.id, sortOrder: comp.sortOrder } },
        update: { componentProductId, name: comp.name, quantity: comp.quantity, isRemovable: comp.isRemovable, isReplaceable: comp.isReplaceable },
        create: { platterDefinitionId: platterDef.id, componentProductId, name: comp.name, quantity: comp.quantity, isRemovable: comp.isRemovable, isReplaceable: comp.isReplaceable, sortOrder: comp.sortOrder },
      });
    }
  }
}

function demoProducts(): DemoProductDefinition[] {
  return [
    { name: 'Coca-Cola', productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'bar', taxName: 'IVA General' },
    { name: 'Agua mineral', productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'direct', taxName: 'VAT 0%' },
    { name: 'Cerveza', productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'bar', taxName: 'IVA General' },
    { name: 'Limonada con gas', productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'bar', taxName: 'IVA General' },
    { name: 'Vino tinto copa', productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'bar', taxName: 'IVA General' },
    {
      name: 'Hamburguesa craft',
      description: 'Hamburguesa de ternera con lechuga, tomate, cebolla, pepinillos y salsa de la casa.',
      productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
    },
    {
      name: 'Hamburguesa clasica',
      description: 'Hamburguesa clásica con queso, lechuga y tomate.',
      productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
    },
    {
      name: 'Hamburguesa trufada',
      description: 'Hamburguesa premium con queso de trufa y cebolla caramelizada.',
      productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
    },
    {
      name: 'Hamburguesa vegetal',
      description: 'Hamburguesa vegetal con aguacate y pimientos asados.',
      productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
    },
    { name: 'Croquetas de jamon iberico', description: 'Croquetas caseras de jamón ibérico de bellota.', productType: 'simple', defaultCourse: 'starter', defaultPreparationRoute: 'kitchen', taxName: 'IVA Reducido' },
    { name: 'Patatas bravas', productType: 'simple', defaultCourse: 'starter', defaultPreparationRoute: 'kitchen', taxName: 'IVA Reducido' },
    { name: 'Nachos caseros', description: 'Totopos con cheddar fundido y pico de gallo.', productType: 'simple', defaultCourse: 'starter', defaultPreparationRoute: 'kitchen', taxName: 'IVA Reducido' },
    { name: 'Patatas fritas', productType: 'simple', defaultCourse: 'other', defaultPreparationRoute: 'kitchen', taxName: 'IVA General' },
    { name: 'Ensalada cesar', description: 'Lechuga romana, pollo a la plancha, anchoas y aliño César.', productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'cold_station', taxName: 'IVA Reducido' },
    { name: 'Ensalada', productType: 'simple', defaultCourse: 'starter', defaultPreparationRoute: 'cold_station', taxName: 'IVA Reducido' },
    {
      name: 'Plato combinado de lomo',
      description: 'Lomo a la plancha con huevo, patatas fritas y ensalada.',
      productType: 'platter', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
    },
    {
      name: 'Plato combinado de pollo',
      description: 'Pollo a la plancha con huevo, patatas fritas y ensalada.',
      productType: 'platter', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
    },
    {
      name: 'Plato combinado vegetal',
      description: 'Huevo, patatas fritas, ensalada y verduras de temporada.',
      productType: 'platter', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
    },
    { name: 'Tarta de queso', productType: 'simple', defaultCourse: 'dessert', defaultPreparationRoute: 'dessert_station', taxName: 'IVA Reducido' },
    { name: 'Coulant de chocolate', description: 'Bizcocho de chocolate con interior fundido y helado de vainilla.', productType: 'simple', defaultCourse: 'dessert', defaultPreparationRoute: 'dessert_station', taxName: 'IVA Reducido' },
    { name: 'Cafe solo', productType: 'simple', defaultCourse: 'dessert', defaultPreparationRoute: 'bar', taxName: 'IVA Reducido' },
    { name: 'Cafe con leche', productType: 'simple', defaultCourse: 'dessert', defaultPreparationRoute: 'bar', taxName: 'IVA Reducido' },
    {
      name: 'Menu Classic Burger',
      description: 'Hamburguesa a elegir, bebida y acompañamiento.',
      productType: 'combo', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
    },
    { name: 'Sandwich club', productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA Reducido' },
  ];
}

function demoRestaurantProducts(): Array<{
  productName: string;
  displayName?: string;
  displayDescription?: string;
  imageUrl?: string | null;
  priceCents: number;
  isAvailable?: boolean;
  preparationRouteOverride?: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  sortOrder: number;
}> {
  return [
    { productName: 'Coca-Cola', priceCents: 320, sortOrder: 1 },
    { productName: 'Agua mineral', priceCents: 200, sortOrder: 2 },
    { productName: 'Cerveza', priceCents: 380, isAvailable: false, sortOrder: 3 },
    { productName: 'Limonada con gas', priceCents: 450, sortOrder: 4 },
    { productName: 'Vino tinto copa', priceCents: 420, sortOrder: 5 },
    {
      productName: 'Hamburguesa craft',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/hamburguesa-craft.jpg',
      priceCents: 1250,
      sortOrder: 6,
    },
    { productName: 'Hamburguesa clasica', priceCents: 1150, sortOrder: 7 },
    { productName: 'Hamburguesa trufada', priceCents: 1550, sortOrder: 8 },
    { productName: 'Hamburguesa vegetal', priceCents: 1300, sortOrder: 9 },
    { productName: 'Croquetas de jamon iberico', priceCents: 875, sortOrder: 10 },
    { productName: 'Patatas bravas', priceCents: 675, sortOrder: 11 },
    { productName: 'Nachos caseros', priceCents: 890, sortOrder: 12 },
    { productName: 'Patatas fritas', priceCents: 450, sortOrder: 13 },
    { productName: 'Ensalada cesar', priceCents: 1000, sortOrder: 14 },
    { productName: 'Ensalada', priceCents: 450, sortOrder: 15 },
    { productName: 'Plato combinado de lomo', imageUrl: null, priceCents: 1290, sortOrder: 16 },
    { productName: 'Plato combinado de pollo', priceCents: 1250, sortOrder: 17 },
    { productName: 'Plato combinado vegetal', priceCents: 1190, sortOrder: 18 },
    { productName: 'Tarta de queso', priceCents: 700, isAvailable: false, sortOrder: 19 },
    { productName: 'Coulant de chocolate', priceCents: 700, isAvailable: false, sortOrder: 20 },
    { productName: 'Cafe solo', priceCents: 250, sortOrder: 21 },
    { productName: 'Cafe con leche', priceCents: 280, sortOrder: 22 },
    {
      productName: 'Menu Classic Burger',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/menu-classic-burger.jpg',
      priceCents: 1390,
      sortOrder: 23,
    },
    // backward compat
    { productName: 'Sandwich club', priceCents: 1090, sortOrder: 24 },
  ];
}

export const MESAFLOW_DEMO_ORGANIZATION_NAME = DEMO_ORGANIZATION_NAME;
export const MESAFLOW_DEMO_RESTAURANT_NAME = DEMO_RESTAURANT_NAME;
