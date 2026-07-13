import type { PrismaClient } from '@prisma/client';

const DEMO_ORGANIZATION_NAME = 'MesaFlow Demo';
const DEMO_RESTAURANT_NAME = 'MesaFlow Centro';

type DemoAllergen =
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soybeans'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

type DemoProductDefinition = {
  name: string;
  nameI18n?: {
    es?: string;
    ca?: string;
    en?: string;
  };
  description?: string;
  productType: 'simple' | 'combo' | 'platter';
  defaultCourse: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
  defaultPreparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  taxName: string;
  allergens?: DemoAllergen[];
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
        nameI18n: product.nameI18n ?? undefined,
        description: product.description ?? null,
        productType: product.productType,
        defaultCourse: product.defaultCourse,
        defaultPreparationRoute: product.defaultPreparationRoute,
        allergens: product.allergens ?? [],
        taxRateId: taxRateIdByName.get(product.taxName) ?? null,
        isActive: true,
      },
      create: {
        organizationId: organization.id,
        name: product.name,
        nameI18n: product.nameI18n,
        description: product.description ?? null,
        productType: product.productType,
        defaultCourse: product.defaultCourse,
        defaultPreparationRoute: product.defaultPreparationRoute,
        allergens: product.allergens ?? [],
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
    update: { sortOrder: 1, isVisible: true, nameI18n: { es: 'Bebidas', ca: 'Begudes', en: 'Drinks' } },
    create: { menuId: menu.id, name: 'Bebidas', nameI18n: { es: 'Bebidas', ca: 'Begudes', en: 'Drinks' }, sortOrder: 1, isVisible: true },
  });
  const tapasSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Tapas' } },
    update: { sortOrder: 2, isVisible: true, nameI18n: { es: 'Tapas', ca: 'Tapes', en: 'Tapas' } },
    create: { menuId: menu.id, name: 'Tapas', nameI18n: { es: 'Tapas', ca: 'Tapes', en: 'Tapas' }, sortOrder: 2, isVisible: true },
  });
  const burgersSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Hamburguesas' } },
    update: { sortOrder: 3, isVisible: true, nameI18n: { es: 'Hamburguesas', ca: 'Hamburgueses', en: 'Burgers' } },
    create: { menuId: menu.id, name: 'Hamburguesas', nameI18n: { es: 'Hamburguesas', ca: 'Hamburgueses', en: 'Burgers' }, sortOrder: 3, isVisible: true },
  });
  const saladsSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Ensaladas' } },
    update: { sortOrder: 4, isVisible: true, nameI18n: { es: 'Ensaladas', ca: 'Amanides', en: 'Salads' } },
    create: { menuId: menu.id, name: 'Ensaladas', nameI18n: { es: 'Ensaladas', ca: 'Amanides', en: 'Salads' }, sortOrder: 4, isVisible: true },
  });
  const plattersSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Platos combinados' } },
    update: { sortOrder: 5, isVisible: true, nameI18n: { es: 'Platos combinados', ca: 'Plats combinats', en: 'Platters' } },
    create: { menuId: menu.id, name: 'Platos combinados', nameI18n: { es: 'Platos combinados', ca: 'Plats combinats', en: 'Platters' }, sortOrder: 5, isVisible: true },
  });
  const dessertsSection = await prisma.menuSection.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Postres' } },
    update: { sortOrder: 6, isVisible: true, nameI18n: { es: 'Postres', ca: 'Postres', en: 'Desserts' } },
    create: { menuId: menu.id, name: 'Postres', nameI18n: { es: 'Postres', ca: 'Postres', en: 'Desserts' }, sortOrder: 6, isVisible: true },
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

  for (const section of [
    { id: drinksSection.id, nameI18n: { es: 'Bebidas', ca: 'Begudes', en: 'Drinks' } },
    { id: tapasSection.id, nameI18n: { es: 'Tapas', ca: 'Tapes', en: 'Tapas' } },
    { id: burgersSection.id, nameI18n: { es: 'Hamburguesas', ca: 'Hamburgueses', en: 'Burgers' } },
    { id: saladsSection.id, nameI18n: { es: 'Ensaladas', ca: 'Amanides', en: 'Salads' } },
    { id: plattersSection.id, nameI18n: { es: 'Platos combinados', ca: 'Plats combinats', en: 'Platters' } },
    { id: dessertsSection.id, nameI18n: { es: 'Postres', ca: 'Postres', en: 'Desserts' } },
    { id: coffeeSection.id, nameI18n: { es: 'Caf\u00e9', ca: 'Caf\u00e8', en: 'Coffee' } },
    { id: menusSection.id, nameI18n: { es: 'Men\u00fas', ca: 'Men\u00fas', en: 'Menus' } },
  ]) {
    await prisma.menuSection.update({
      where: { id: section.id },
      data: { nameI18n: section.nameI18n },
    });
  }

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
    update: { selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false, nameI18n: { es: 'Extras de hamburguesa', ca: "Extres d'hamburguesa", en: 'Burger extras' } },
    create: { organizationId: organization.id, name: 'Extras de hamburguesa', nameI18n: { es: 'Extras de hamburguesa', ca: "Extres d'hamburguesa", en: 'Burger extras' }, selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
  });
  const burgerRemoveGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Quitar ingredientes hamburguesa' } },
    update: { selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false, nameI18n: { es: 'Quitar ingredientes hamburguesa', ca: "Treure ingredients d'hamburguesa", en: 'Remove burger ingredients' } },
    create: { organizationId: organization.id, name: 'Quitar ingredientes hamburguesa', nameI18n: { es: 'Quitar ingredientes hamburguesa', ca: "Treure ingredients d'hamburguesa", en: 'Remove burger ingredients' }, selectionType: 'multiple', minSelections: 0, maxSelections: 3, isRequired: false },
  });
  const burgerPointGroup = await prisma.modifierGroup.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Punto de la carne' } },
    update: { selectionType: 'single', minSelections: 1, maxSelections: 1, isRequired: true, nameI18n: { es: 'Punto de la carne', ca: 'Punt de la carn', en: 'Burger point' } },
    create: { organizationId: organization.id, name: 'Punto de la carne', nameI18n: { es: 'Punto de la carne', ca: 'Punt de la carn', en: 'Burger point' }, selectionType: 'single', minSelections: 1, maxSelections: 1, isRequired: true },
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

  for (const group of [
    { id: burgerExtrasGroup.id, nameI18n: { es: 'Extras de hamburguesa', ca: "Extres d'hamburguesa", en: 'Burger extras' } },
    { id: burgerRemoveGroup.id, nameI18n: { es: 'Quitar ingredientes hamburguesa', ca: "Treure ingredients d'hamburguesa", en: 'Remove burger ingredients' } },
    { id: burgerPointGroup.id, nameI18n: { es: 'Punto de la carne', ca: 'Punt de la carn', en: 'Burger point' } },
    { id: drinkSizeGroup.id, nameI18n: { es: 'Tama\u00f1o de bebida', ca: 'Mida de beguda', en: 'Drink size' } },
    { id: coffeeOptionsGroup.id, nameI18n: { es: 'Opciones de caf\u00e9', ca: 'Opcions de caf\u00e8', en: 'Coffee options' } },
    { id: platterRemoveGroup.id, nameI18n: { es: 'Quitar ingredientes plato', ca: 'Treure ingredients del plat', en: 'Remove platter ingredients' } },
    { id: platterExtrasGroup.id, nameI18n: { es: 'Extras de plato combinado', ca: 'Extres de plat combinat', en: 'Platter extras' } },
  ]) {
    await prisma.modifierGroup.update({
      where: { id: group.id },
      data: { nameI18n: group.nameI18n },
    });
  }

  for (const option of [
    { groupId: burgerExtrasGroup.id, name: 'Bacon', nameI18n: { es: 'Bacon', ca: 'Bacon', en: 'Bacon' }, priceDeltaCents: 150, sortOrder: 1 },
    { groupId: burgerExtrasGroup.id, name: 'Queso extra', nameI18n: { es: 'Queso extra', ca: 'Formatge extra', en: 'Extra cheese' }, priceDeltaCents: 100, sortOrder: 2 },
    { groupId: burgerExtrasGroup.id, name: 'Huevo', nameI18n: { es: 'Huevo', ca: 'Ou', en: 'Egg' }, priceDeltaCents: 120, sortOrder: 3 },
    { groupId: burgerRemoveGroup.id, name: 'Sin cebolla', nameI18n: { es: 'Sin cebolla', ca: 'Sense ceba', en: 'No onion' }, priceDeltaCents: 0, sortOrder: 1 },
    { groupId: burgerRemoveGroup.id, name: 'Sin pepinillos', nameI18n: { es: 'Sin pepinillos', ca: 'Sense cogombrets', en: 'No pickles' }, priceDeltaCents: 0, sortOrder: 2 },
    { groupId: burgerRemoveGroup.id, name: 'Sin salsa', nameI18n: { es: 'Sin salsa', ca: 'Sense salsa', en: 'No sauce' }, priceDeltaCents: 0, sortOrder: 3 },
    { groupId: burgerPointGroup.id, name: 'Poco hecha', nameI18n: { es: 'Poco hecha', ca: 'Poc feta', en: 'Rare' }, priceDeltaCents: 0, sortOrder: 1 },
    { groupId: burgerPointGroup.id, name: 'Al punto', nameI18n: { es: 'Al punto', ca: 'Al punt', en: 'Medium' }, priceDeltaCents: 0, sortOrder: 2 },
    { groupId: burgerPointGroup.id, name: 'Muy hecha', nameI18n: { es: 'Muy hecha', ca: 'Molt feta', en: 'Well done' }, priceDeltaCents: 0, sortOrder: 3 },
    { groupId: drinkSizeGroup.id, name: 'Mediana', nameI18n: { es: 'Mediana', ca: 'Mitjana', en: 'Medium' }, priceDeltaCents: 0, sortOrder: 1 },
    { groupId: drinkSizeGroup.id, name: 'Grande', nameI18n: { es: 'Grande', ca: 'Gran', en: 'Large' }, priceDeltaCents: 80, sortOrder: 2 },
    { groupId: drinkSizeGroup.id, name: 'XL', nameI18n: { es: 'XL', ca: 'XL', en: 'XL' }, priceDeltaCents: 120, sortOrder: 3 },
    { groupId: coffeeOptionsGroup.id, name: 'Carga extra', nameI18n: { es: 'Carga extra', ca: 'C\u00e0rrega extra', en: 'Extra shot' }, priceDeltaCents: 70, sortOrder: 1 },
    { groupId: coffeeOptionsGroup.id, name: 'Bebida de avena', nameI18n: { es: 'Bebida de avena', ca: 'Beguda de civada', en: 'Oat drink' }, priceDeltaCents: 50, sortOrder: 2 },
    { groupId: coffeeOptionsGroup.id, name: 'Descafeinado', nameI18n: { es: 'Descafeinado', ca: 'Descafe\u00efnat', en: 'Decaf' }, priceDeltaCents: 0, sortOrder: 3 },
    { groupId: platterRemoveGroup.id, name: 'Sin huevo', nameI18n: { es: 'Sin huevo', ca: 'Sense ou', en: 'No egg' }, priceDeltaCents: 0, sortOrder: 1 },
    { groupId: platterRemoveGroup.id, name: 'Sin patatas', nameI18n: { es: 'Sin patatas', ca: 'Sense patates', en: 'No fries' }, priceDeltaCents: 0, sortOrder: 2 },
    { groupId: platterRemoveGroup.id, name: 'Sin ensalada', nameI18n: { es: 'Sin ensalada', ca: 'Sense amanida', en: 'No salad' }, priceDeltaCents: 0, sortOrder: 3 },
    { groupId: platterExtrasGroup.id, name: 'Huevo extra', nameI18n: { es: 'Huevo extra', ca: 'Ou extra', en: 'Extra egg' }, priceDeltaCents: 120, sortOrder: 1 },
    { groupId: platterExtrasGroup.id, name: 'Patatas extra', nameI18n: { es: 'Patatas extra', ca: 'Patates extra', en: 'Extra fries' }, priceDeltaCents: 150, sortOrder: 2 },
    { groupId: platterExtrasGroup.id, name: 'Salsa extra', nameI18n: { es: 'Salsa extra', ca: 'Salsa extra', en: 'Extra sauce' }, priceDeltaCents: 80, sortOrder: 3 },
  ]) {
    await prisma.modifierOption.upsert({
      where: { modifierGroupId_name: { modifierGroupId: option.groupId, name: option.name } },
      update: { nameI18n: option.nameI18n, priceDeltaCents: option.priceDeltaCents, isAvailable: true, sortOrder: option.sortOrder },
      create: { modifierGroupId: option.groupId, name: option.name, nameI18n: option.nameI18n, priceDeltaCents: option.priceDeltaCents, isAvailable: true, sortOrder: option.sortOrder },
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
  const comboBurgerSlotNameI18n = { es: 'Hamburguesa', ca: 'Hamburguesa', en: 'Burger' };
  const comboBurgerSlot = await prisma.comboSlot.upsert({
    where: { comboDefinitionId_name: { comboDefinitionId: comboDefinition.id, name: 'Hamburguesa' } },
    update: { minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 1, nameI18n: comboBurgerSlotNameI18n },
    create: { comboDefinitionId: comboDefinition.id, name: 'Hamburguesa', nameI18n: comboBurgerSlotNameI18n, minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 1 },
  });
  const comboDrinkSlotNameI18n = { es: 'Bebida', ca: 'Beguda', en: 'Drink' };
  const comboDrinkSlot = await prisma.comboSlot.upsert({
    where: { comboDefinitionId_name: { comboDefinitionId: comboDefinition.id, name: 'Bebida' } },
    update: { minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 2, nameI18n: comboDrinkSlotNameI18n },
    create: { comboDefinitionId: comboDefinition.id, name: 'Bebida', nameI18n: comboDrinkSlotNameI18n, minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 2 },
  });
  const comboSideSlotNameI18n = { es: 'Acompa\u00f1amiento', ca: 'Acompanyament', en: 'Side' };
  const comboSideSlot = await prisma.comboSlot.upsert({
    where: { comboDefinitionId_name: { comboDefinitionId: comboDefinition.id, name: 'Acompañamiento' } },
    update: { minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 3, nameI18n: comboSideSlotNameI18n },
    create: { comboDefinitionId: comboDefinition.id, name: 'Acompa\u00f1amiento', nameI18n: comboSideSlotNameI18n, minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 3 },
  });

  const comboSlotOptions = [
    { slotId: comboBurgerSlot.id, productName: 'Hamburguesa clasica', supplementPriceCents: 0, isDefault: true, sortOrder: 1 },
    { slotId: comboBurgerSlot.id, productName: 'Hamburguesa craft', supplementPriceCents: 100, isDefault: false, sortOrder: 2 },
    { slotId: comboBurgerSlot.id, productName: 'Hamburguesa vegetal', supplementPriceCents: 50, isDefault: false, sortOrder: 3 },
    { slotId: comboDrinkSlot.id, productName: 'Agua mineral', supplementPriceCents: 0, isDefault: true, sortOrder: 1 },
    { slotId: comboDrinkSlot.id, productName: 'Coca-Cola', supplementPriceCents: 0, isDefault: false, sortOrder: 2 },
    { slotId: comboDrinkSlot.id, productName: 'Cerveza', supplementPriceCents: 150, isDefault: false, sortOrder: 3 },
    { slotId: comboSideSlot.id, productName: 'Patatas fritas', supplementPriceCents: 0, isDefault: true, sortOrder: 1 },
    { slotId: comboSideSlot.id, productName: 'Ensalada', supplementPriceCents: 50, isDefault: false, sortOrder: 2 },
  ].map((opt) => {
    const restaurantProductId = saleIdByProductName.get(opt.productName);
    if (!restaurantProductId) throw new Error(`Missing combo slot option product "${opt.productName}".`);
    return {
      comboSlotId: opt.slotId,
      restaurantProductId,
      supplementPriceCents: opt.supplementPriceCents,
      isDefault: opt.isDefault,
      isAvailable: true,
      sortOrder: opt.sortOrder,
    };
  });

  // `sortOrder` is unique per combo slot, so a plain upsert can collide with a
  // stale row left by an earlier seed run with a different product at the same
  // position. Replace each slot's options wholesale instead.
  await prisma.comboSlotOption.deleteMany({
    where: { comboSlotId: { in: [comboBurgerSlot.id, comboDrinkSlot.id, comboSideSlot.id] } },
  });
  await prisma.comboSlotOption.createMany({ data: comboSlotOptions });

  // ── Platters ─────────────────────────────────────────────────────────────────

  const platterComponentNameI18n: Record<string, { es: string; ca: string; en: string }> = {
    Lomo: { es: 'Lomo', ca: 'Llom', en: 'Pork loin' },
    Huevo: { es: 'Huevo', ca: 'Ou', en: 'Egg' },
    'Patatas fritas': { es: 'Patatas fritas', ca: 'Patates fregides', en: 'French fries' },
    Ensalada: { es: 'Ensalada', ca: 'Amanida', en: 'Salad' },
    Pollo: { es: 'Pollo', ca: 'Pollastre', en: 'Chicken' },
    'Verduras de temporada': { es: 'Verduras de temporada', ca: 'Verdures de temporada', en: 'Seasonal vegetables' },
  };

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
      const nameI18n = platterComponentNameI18n[comp.name];
      await prisma.platterComponent.upsert({
        where: { platterDefinitionId_sortOrder: { platterDefinitionId: platterDef.id, sortOrder: comp.sortOrder } },
        update: { componentProductId, name: comp.name, nameI18n, quantity: comp.quantity, isRemovable: comp.isRemovable, isReplaceable: comp.isReplaceable },
        create: { platterDefinitionId: platterDef.id, componentProductId, name: comp.name, nameI18n, quantity: comp.quantity, isRemovable: comp.isRemovable, isReplaceable: comp.isReplaceable, sortOrder: comp.sortOrder },
      });
    }
  }
}

function demoProducts(): DemoProductDefinition[] {
  return [
    { name: 'Coca-Cola', nameI18n: { es: 'Coca-Cola', ca: 'Coca-Cola', en: 'Coke' }, productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'bar', taxName: 'IVA General' },
    { name: 'Agua mineral', nameI18n: { es: 'Agua mineral', ca: 'Aigua mineral', en: 'Mineral water' }, productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'direct', taxName: 'VAT 0%' },
    { name: 'Cerveza', nameI18n: { es: 'Cerveza', ca: 'Cervesa', en: 'Beer' }, productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'bar', taxName: 'IVA General' },
    { name: 'Limonada con gas', productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'bar', taxName: 'IVA General' },
    { name: 'Vino tinto copa', productType: 'simple', defaultCourse: 'drinks', defaultPreparationRoute: 'bar', taxName: 'IVA General' },
    {
      name: 'Hamburguesa craft',
      description: 'Hamburguesa de ternera con lechuga, tomate, cebolla, pepinillos y salsa de la casa.',
      productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
      allergens: ['gluten', 'eggs', 'milk', 'mustard'],
    },
    {
      name: 'Hamburguesa clasica',
      nameI18n: { es: 'Hamburguesa cl\u00e1sica', ca: 'Hamburguesa cl\u00e0ssica', en: 'Classic burger' },
      description: 'Hamburguesa cl\u00e1sica con queso, lechuga y tomate.',
      productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
      allergens: ['gluten', 'milk'],
    },
    {
      name: 'Hamburguesa trufada',
      description: 'Hamburguesa premium con queso de trufa y cebolla caramelizada.',
      productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
      allergens: ['gluten', 'milk'],
    },
    {
      name: 'Hamburguesa vegetal',
      description: 'Hamburguesa vegetal con aguacate y pimientos asados.',
      productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
      allergens: ['gluten', 'soybeans'],
    },
    {
      name: 'Croquetas de jamon iberico',
      nameI18n: { es: 'Croquetas de jam\u00f3n ib\u00e9rico', ca: 'Croquetes de pernil ib\u00e8ric', en: 'Iberian ham croquettes' },
      description: 'Croquetas caseras de jam\u00f3n ib\u00e9rico de bellota.',
      productType: 'simple', defaultCourse: 'starter', defaultPreparationRoute: 'kitchen', taxName: 'IVA Reducido',
      allergens: ['gluten', 'milk', 'eggs'],
    },
    {
      name: 'Patatas bravas',
      productType: 'simple', defaultCourse: 'starter', defaultPreparationRoute: 'kitchen', taxName: 'IVA Reducido',
      allergens: ['eggs', 'mustard'],
    },
    {
      name: 'Nachos caseros',
      description: 'Totopos con cheddar fundido y pico de gallo.',
      productType: 'simple', defaultCourse: 'starter', defaultPreparationRoute: 'kitchen', taxName: 'IVA Reducido',
      allergens: ['milk'],
    },
    { name: 'Patatas fritas', productType: 'simple', defaultCourse: 'other', defaultPreparationRoute: 'kitchen', taxName: 'IVA General' },
    {
      name: 'Ensalada cesar',
      nameI18n: { es: 'Ensalada C\u00e9sar', ca: 'Amanida C\u00e8sar', en: 'Caesar salad' },
      description: 'Lechuga romana, pollo a la plancha, anchoas y ali\u00f1o C\u00e9sar.',
      productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'cold_station', taxName: 'IVA Reducido',
      allergens: ['fish', 'eggs', 'milk'],
    },
    { name: 'Ensalada', productType: 'simple', defaultCourse: 'starter', defaultPreparationRoute: 'cold_station', taxName: 'IVA Reducido' },
    {
      name: 'Plato combinado de lomo',
      description: 'Lomo a la plancha con huevo, patatas fritas y ensalada.',
      productType: 'platter', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
      allergens: ['eggs'],
    },
    {
      name: 'Plato combinado de pollo',
      description: 'Pollo a la plancha con huevo, patatas fritas y ensalada.',
      productType: 'platter', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
      allergens: ['eggs'],
    },
    {
      name: 'Plato combinado vegetal',
      description: 'Huevo, patatas fritas, ensalada y verduras de temporada.',
      productType: 'platter', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
      allergens: ['eggs'],
    },
    {
      name: 'Tarta de queso',
      productType: 'simple', defaultCourse: 'dessert', defaultPreparationRoute: 'dessert_station', taxName: 'IVA Reducido',
      allergens: ['gluten', 'milk', 'eggs'],
    },
    {
      name: 'Coulant de chocolate',
      description: 'Bizcocho de chocolate con interior fundido y helado de vainilla.',
      productType: 'simple', defaultCourse: 'dessert', defaultPreparationRoute: 'dessert_station', taxName: 'IVA Reducido',
      allergens: ['gluten', 'milk', 'eggs', 'nuts'],
    },
    {
      name: 'Cafe solo',
      nameI18n: { es: 'Caf\u00e9 solo', ca: 'Caf\u00e8 sol', en: 'Espresso' },
      productType: 'simple',
      defaultCourse: 'dessert',
      defaultPreparationRoute: 'bar',
      taxName: 'IVA Reducido',
    },
    {
      name: 'Cafe con leche',
      nameI18n: { es: 'Caf\u00e9 con leche', ca: 'Caf\u00e8 amb llet', en: 'Coffee with milk' },
      productType: 'simple', defaultCourse: 'dessert', defaultPreparationRoute: 'bar', taxName: 'IVA Reducido',
      allergens: ['milk'],
    },
    {
      name: 'Menu Classic Burger',
      nameI18n: { es: 'Men\u00fa Classic Burger', ca: 'Men\u00fa Classic Burger', en: 'Classic Burger Menu' },
      description: 'Hamburguesa a elegir, bebida y acompa\u00f1amiento.',
      productType: 'combo', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA General',
      allergens: ['gluten', 'milk'],
    },
    { name: 'Sandwich club', productType: 'simple', defaultCourse: 'main', defaultPreparationRoute: 'kitchen', taxName: 'IVA Reducido', allergens: ['gluten', 'eggs', 'milk'] },
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
    { productName: 'Hamburguesa clasica', displayName: 'Hamburguesa cl\u00e1sica', priceCents: 1150, sortOrder: 7 },
    { productName: 'Hamburguesa trufada', priceCents: 1550, sortOrder: 8 },
    { productName: 'Hamburguesa vegetal', priceCents: 1300, sortOrder: 9 },
    {
      productName: 'Croquetas de jamon iberico',
      displayName: 'Croquetas de jam\u00f3n ib\u00e9rico',
      displayDescription: 'Croquetas caseras de jam\u00f3n ib\u00e9rico de bellota.',
      priceCents: 875,
      sortOrder: 10,
    },
    { productName: 'Patatas bravas', priceCents: 675, sortOrder: 11 },
    { productName: 'Nachos caseros', priceCents: 890, sortOrder: 12 },
    { productName: 'Patatas fritas', priceCents: 450, sortOrder: 13 },
    {
      productName: 'Ensalada cesar',
      displayName: 'Ensalada C\u00e9sar',
      displayDescription: 'Lechuga romana, pollo a la plancha, anchoas y ali\u00f1o C\u00e9sar.',
      priceCents: 1000,
      sortOrder: 14,
    },
    { productName: 'Ensalada', priceCents: 450, sortOrder: 15 },
    { productName: 'Plato combinado de lomo', imageUrl: null, priceCents: 1290, sortOrder: 16 },
    { productName: 'Plato combinado de pollo', priceCents: 1250, sortOrder: 17 },
    { productName: 'Plato combinado vegetal', priceCents: 1190, sortOrder: 18 },
    { productName: 'Tarta de queso', priceCents: 700, isAvailable: false, sortOrder: 19 },
    { productName: 'Coulant de chocolate', priceCents: 700, isAvailable: false, sortOrder: 20 },
    { productName: 'Cafe solo', displayName: 'Caf\u00e9 solo', priceCents: 250, sortOrder: 21 },
    { productName: 'Cafe con leche', displayName: 'Caf\u00e9 con leche', priceCents: 280, sortOrder: 22 },
    {
      productName: 'Menu Classic Burger',
      displayName: 'Men\u00fa Classic Burger',
      displayDescription: 'Hamburguesa a elegir, bebida y acompa\u00f1amiento.',
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
