import { computed, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { AppLocale } from '../../../shared/i18n/locale.types';
import { deriveModifierGroupDisplayType } from '../models/modifier-group.model';
import type { ComboProductDefinition, ComboSlot, MenuCategory, ModifierGroup, ModifierOption, NameI18n, Product, ProductPreparationPolicy } from '../models/menu.models';

type LocalizedText = Record<AppLocale, string>;
type LocalizedOptionalText = Partial<Record<AppLocale, string>>;

type MenuCategoryDefinition = Omit<MenuCategory, 'name'> & {
  name: LocalizedText;
};

type ModifierOptionDefinition = Omit<ModifierOption, 'name'> & {
  name: LocalizedText;
};

type ModifierGroupDefinition = Omit<ModifierGroup, 'name' | 'options' | 'displayType'> & {
  name: LocalizedText;
  options: ModifierOptionDefinition[];
};

type ProductDefinition = Omit<Product, 'name' | 'description' | 'category' | 'allergens'> & {
  name: LocalizedText;
  description?: LocalizedOptionalText;
  allergens?: LocalizedText[];
  imageUrl?: string | null;
};

type ComboSlotDefinition = Omit<ComboSlot, 'name'> & {
  name: LocalizedText;
};

type ComboProductDefinitionSource = Omit<ComboProductDefinition, 'slots'> & {
  slots: ComboSlotDefinition[];
};

export const MOCK_MENU_CATEGORY_DEFINITIONS: MenuCategoryDefinition[] = [
  { id: 'drinks', name: { es: 'Bebidas', en: 'Drinks', ca: 'Begudes' }, sortOrder: 10 },
  { id: 'tapas', name: { es: 'Tapas', en: 'Tapas', ca: 'Tapes' }, sortOrder: 20 },
  { id: 'burgers', name: { es: 'Hamburguesas', en: 'Burgers', ca: 'Hamburgueses' }, sortOrder: 30 },
  { id: 'burgers-classic', name: { es: 'Clásicas', en: 'Classic', ca: 'Clàssiques' }, parentId: 'burgers', sortOrder: 31 },
  { id: 'burgers-premium', name: { es: 'Premium', en: 'Premium', ca: 'Premium' }, parentId: 'burgers', sortOrder: 32 },
  { id: 'burgers-veggie', name: { es: 'Vegetales', en: 'Veggie', ca: 'Vegetals' }, parentId: 'burgers', sortOrder: 33 },
  { id: 'salads', name: { es: 'Ensaladas', en: 'Salads', ca: 'Amanides' }, sortOrder: 40 },
  { id: 'platters', name: { es: 'Platos combinados', en: 'Platters', ca: 'Plats combinats' }, sortOrder: 45 },
  { id: 'desserts', name: { es: 'Postres', en: 'Desserts', ca: 'Postres' }, sortOrder: 50 },
  { id: 'coffee', name: { es: 'Café', en: 'Coffee', ca: 'Cafè' }, sortOrder: 60 },
  { id: 'menus', name: { es: 'Menús', en: 'Menus', ca: 'Menús' }, sortOrder: 70 },
];

export const MOCK_MODIFIER_GROUP_DEFINITIONS: ModifierGroupDefinition[] = [
  {
    id: 'burger-extras',
    name: { es: 'Extras de hamburguesa', en: 'Burger extras', ca: "Extres d'hamburguesa" },
    type: 'multiple',
    required: false,
    minSelections: 0,
    maxSelections: 3,
    options: [
      {
        id: 'extra-bacon',
        name: { es: 'Bacon', en: 'Bacon', ca: 'Bacó' },
        priceDelta: 1.5,
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/w_120,h_120,c_fill/food/bacon.jpg',
      },
      {
        id: 'extra-cheese',
        name: { es: 'Queso', en: 'Cheese', ca: 'Formatge' },
        priceDelta: 1,
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/w_120,h_120,c_fill/food/cheese.jpg',
      },
      { id: 'extra-egg', name: { es: 'Huevo', en: 'Egg', ca: 'Ou' }, priceDelta: 1.2 },
    ],
  },
  {
    id: 'burger-remove',
    name: { es: 'Quitar ingredientes', en: 'Remove ingredients', ca: 'Treure ingredients' },
    type: 'remove',
    required: false,
    minSelections: 0,
    maxSelections: 3,
    options: [
      { id: 'remove-onion', name: { es: 'Cebolla', en: 'Onion', ca: 'Ceba' }, priceDelta: 0 },
      { id: 'remove-pickles', name: { es: 'Pepinillos', en: 'Pickles', ca: 'Cogombrets' }, priceDelta: 0 },
      { id: 'remove-sauce', name: { es: 'Salsa', en: 'Sauce', ca: 'Salsa' }, priceDelta: 0 },
    ],
  },
  {
    id: 'burger-point',
    name: { es: 'Punto de la carne', en: 'Burger point', ca: 'Punt de la carn' },
    type: 'single',
    required: true,
    minSelections: 1,
    maxSelections: 1,
    options: [
      { id: 'point-rare', name: { es: 'Poco hecha', en: 'Rare', ca: 'Poc feta' }, priceDelta: 0 },
      { id: 'point-medium', name: { es: 'Al punto', en: 'Medium', ca: 'Al punt' }, priceDelta: 0, selectedByDefault: true },
      { id: 'point-well-done', name: { es: 'Muy hecha', en: 'Well done', ca: 'Molt feta' }, priceDelta: 0 },
    ],
  },
  {
    id: 'drink-size',
    name: { es: 'Tamaño de bebida', en: 'Drink size', ca: 'Mida de beguda' },
    type: 'single',
    required: true,
    minSelections: 1,
    maxSelections: 1,
    options: [
      { id: 'size-medium', name: { es: 'Mediana', en: 'Medium', ca: 'Mitjana' }, priceDelta: 0, selectedByDefault: true },
      { id: 'size-large', name: { es: 'Grande', en: 'Large', ca: 'Gran' }, priceDelta: 0.8 },
      { id: 'size-xl', name: { es: 'XL', en: 'XL', ca: 'XL' }, priceDelta: 1.2 },
    ],
  },
  {
    id: 'coffee-options',
    name: { es: 'Opciones de café', en: 'Coffee options', ca: 'Opcions de cafè' },
    type: 'multiple',
    required: false,
    minSelections: 0,
    maxSelections: 3,
    options: [
      { id: 'coffee-extra-shot', name: { es: 'Carga extra', en: 'Extra shot', ca: 'Càrrega extra' }, priceDelta: 0.7 },
      { id: 'coffee-oat-milk', name: { es: 'Bebida de avena', en: 'Oat milk', ca: "Beguda d'avena" }, priceDelta: 0.5 },
      { id: 'coffee-decaf', name: { es: 'Descafeinado', en: 'Decaf', ca: 'Descafeïnat' }, priceDelta: 0 },
    ],
  },
  {
    id: 'platter-remove',
    name: { es: 'Quitar ingredientes', en: 'Remove ingredients', ca: 'Treure ingredients' },
    type: 'remove',
    required: false,
    minSelections: 0,
    maxSelections: 4,
    options: [
      { id: 'remove-platter-egg', name: { es: 'Huevo', en: 'Egg', ca: 'Ou' }, priceDelta: 0 },
      { id: 'remove-platter-fries', name: { es: 'Patatas fritas', en: 'Fries', ca: 'Patates fregides' }, priceDelta: 0 },
      { id: 'remove-platter-salad', name: { es: 'Ensalada', en: 'Salad', ca: 'Amanida' }, priceDelta: 0 },
    ],
  },
  {
    id: 'platter-extras',
    name: { es: 'Extras de plato combinado', en: 'Platter extras', ca: 'Extres de plat combinat' },
    type: 'multiple',
    required: false,
    minSelections: 0,
    maxSelections: 3,
    options: [
      { id: 'platter-extra-egg', name: { es: 'Huevo extra', en: 'Extra egg', ca: 'Ou extra' }, priceDelta: 1.2 },
      { id: 'platter-extra-fries', name: { es: 'Patatas extra', en: 'Extra fries', ca: 'Patates extra' }, priceDelta: 1.5 },
      { id: 'platter-extra-sauce', name: { es: 'Salsa extra', en: 'Extra sauce', ca: 'Salsa extra' }, priceDelta: 0.8 },
    ],
  },
];

const ALLERGENS = {
  gluten: { es: 'gluten', en: 'gluten', ca: 'gluten' },
  milk: { es: 'leche', en: 'milk', ca: 'llet' },
  egg: { es: 'huevo', en: 'egg', ca: 'ou' },
  fish: { es: 'pescado', en: 'fish', ca: 'peix' },
} as const satisfies Record<string, LocalizedText>;

const PREPARATION_POLICIES = {
  bar: { route: 'bar', requiresReadyBeforeServe: false },
  cold: { route: 'cold_station', requiresReadyBeforeServe: true },
  kitchen: { route: 'kitchen', requiresReadyBeforeServe: true },
  dessert: { route: 'dessert_station', requiresReadyBeforeServe: true },
} as const satisfies Record<string, ProductPreparationPolicy>;

export const MOCK_MENU_PRODUCT_DEFINITIONS: ProductDefinition[] = [
  {
    id: 'product-1',
    name: { es: 'Hamburguesa craft', en: 'Craft Burger', ca: 'Hamburguesa craft' },
    description: {
      es: 'Hamburguesa de ternera con lechuga, tomate, cebolla, pepinillos y salsa de la casa.',
      en: 'Beef burger with lettuce, tomato, onion, pickles, and house sauce.',
      ca: 'Hamburguesa de vedella amb enciam, tomàquet, ceba, cogombrets i salsa de la casa.',
    },
    categoryId: 'burgers-classic',
    basePrice: 12.5,
    price: 12.5,
    available: true,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/hamburguesa-craft.jpg',
    allergens: [ALLERGENS.gluten, ALLERGENS.milk, ALLERGENS.egg],
    course: 'main',
    type: 'simple',
    modifierGroupIds: ['burger-extras', 'burger-remove', 'burger-point'],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
  },
  {
    id: 'product-2',
    name: { es: 'Croquetas de jamón ibérico', en: 'Iberian Ham Croquettes', ca: 'Croquetes de pernil ibèric' },
    categoryId: 'tapas',
    basePrice: 8.75,
    price: 8.75,
    available: true,
    allergens: [ALLERGENS.gluten, ALLERGENS.milk],
    course: 'starter',
    type: 'simple',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
  },
  {
    id: 'product-3',
    name: { es: 'Limonada con gas', en: 'Sparkling Lemonade', ca: 'Llimonada amb gas' },
    categoryId: 'drinks',
    basePrice: 4.5,
    price: 4.5,
    available: true,
    course: 'drinks',
    type: 'simple',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.bar,
  },
  {
    id: 'product-4',
    name: { es: 'Coulant de chocolate', en: 'Chocolate Coulant', ca: 'Coulant de xocolata' },
    categoryId: 'desserts',
    basePrice: 7,
    price: 7,
    available: false,
    allergens: [ALLERGENS.gluten, ALLERGENS.egg, ALLERGENS.milk],
    course: 'dessert',
    type: 'simple',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.dessert,
  },
  {
    id: 'product-5',
    name: { es: 'Ensalada César', en: 'Caesar Salad', ca: 'Amanida Cèsar' },
    categoryId: 'salads',
    basePrice: 10,
    price: 10,
    available: true,
    allergens: [ALLERGENS.egg, ALLERGENS.fish],
    course: 'main',
    type: 'simple',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.cold,
  },
  {
    id: 'product-6',
    name: { es: 'Café solo', en: 'Espresso', ca: 'Cafè sol' },
    categoryId: 'coffee',
    basePrice: 2.5,
    price: 2.5,
    available: true,
    course: 'drinks',
    type: 'simple',
    modifierGroupIds: ['coffee-options'],
    preparationPolicy: PREPARATION_POLICIES.bar,
  },
  {
    id: 'product-7',
    name: { es: 'Hamburguesa trufada', en: 'Truffle Burger', ca: 'Hamburguesa trufada' },
    categoryId: 'burgers-premium',
    basePrice: 15.5,
    price: 15.5,
    available: true,
    allergens: [ALLERGENS.gluten, ALLERGENS.milk, ALLERGENS.egg],
    course: 'main',
    type: 'simple',
    modifierGroupIds: ['burger-extras', 'burger-remove', 'burger-point'],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
  },
  {
    id: 'product-8',
    name: { es: 'Hamburguesa vegetal', en: 'Veggie Burger', ca: 'Hamburguesa vegetal' },
    categoryId: 'burgers-veggie',
    basePrice: 13,
    price: 13,
    available: true,
    allergens: [ALLERGENS.gluten],
    course: 'main',
    type: 'simple',
    modifierGroupIds: ['burger-extras', 'burger-remove', 'burger-point'],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
  },
  {
    id: 'product-9',
    name: { es: 'Patatas bravas', en: 'Patatas Bravas', ca: 'Patates braves' },
    categoryId: 'tapas',
    basePrice: 6.75,
    price: 6.75,
    available: true,
    course: 'starter',
    type: 'simple',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
  },
  {
    id: 'product-10',
    name: { es: 'Agua', en: 'Water', ca: 'Aigua' },
    categoryId: 'drinks',
    basePrice: 2,
    price: 2,
    available: true,
    course: 'drinks',
    type: 'simple',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.bar,
  },
  {
    id: 'product-11',
    name: { es: 'Cerveza', en: 'Beer', ca: 'Cervesa' },
    categoryId: 'drinks',
    basePrice: 3.8,
    price: 3.8,
    available: false,
    course: 'drinks',
    type: 'simple',
    modifierGroupIds: ['drink-size'],
    preparationPolicy: PREPARATION_POLICIES.bar,
  },
  {
    id: 'product-12',
    name: { es: 'Hamburguesa clásica', en: 'Classic Burger', ca: 'Hamburguesa clàssica' },
    description: {
      es: 'Hamburguesa clásica para la primera iteración del catálogo.',
      en: 'Classic burger for the first menu catalog iteration.',
      ca: 'Hamburguesa clàssica per a la primera iteració del catàleg.',
    },
    categoryId: 'burgers-classic',
    basePrice: 11.5,
    price: 11.5,
    available: true,
    allergens: [ALLERGENS.gluten, ALLERGENS.milk, ALLERGENS.egg],
    course: 'main',
    type: 'simple',
    modifierGroupIds: ['burger-extras', 'burger-remove', 'burger-point'],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
  },
  {
    id: 'product-13',
    name: { es: 'Patatas fritas', en: 'Fries', ca: 'Patates fregides' },
    categoryId: 'tapas',
    basePrice: 4.5,
    price: 4.5,
    available: true,
    course: 'starter',
    type: 'simple',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
  },
  {
    id: 'product-14',
    name: { es: 'Coca-Cola', en: 'Coca-Cola', ca: 'Coca-Cola' },
    categoryId: 'drinks',
    basePrice: 3.2,
    price: 3.2,
    available: true,
    course: 'drinks',
    type: 'simple',
    modifierGroupIds: ['drink-size'],
    preparationPolicy: PREPARATION_POLICIES.bar,
  },
  {
    id: 'product-15',
    name: { es: 'Tarta de queso', en: 'Cheesecake', ca: 'Pastís de formatge' },
    categoryId: 'desserts',
    basePrice: 7,
    price: 7,
    available: false,
    allergens: [ALLERGENS.gluten, ALLERGENS.egg, ALLERGENS.milk],
    course: 'dessert',
    type: 'simple',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.dessert,
  },
  {
    id: 'product-16',
    name: { es: 'Menu Classic Burger', en: 'Classic Burger Menu', ca: 'Menu Classic Burger' },
    description: {
      es: 'Menu con hamburguesa, acompanamiento y bebida. Configuracion de slots proximamente.',
      en: 'Menu with burger, side, and drink. Slot configuration coming soon.',
      ca: 'Menu amb hamburguesa, acompanyament i beguda. Configuracio de slots properament.',
    },
    categoryId: 'menus',
    basePrice: 13.5,
    price: 13.5,
    available: true,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/menu-classic-burger.jpg',
    course: 'main',
    type: 'combo',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
    comboDefinitionId: 'combo-classic-burger-menu',
  },
  {
    id: 'product-17',
    name: { es: 'Plato combinado de lomo', en: 'Pork Loin Platter', ca: 'Plat combinat de llom' },
    description: {
      es: 'Plato combinado con lomo, huevo, patatas fritas y ensalada.',
      en: 'Combined plate with pork loin, egg, fries, and salad.',
      ca: 'Plat combinat amb llom, ou, patates fregides i amanida.',
    },
    categoryId: 'platters',
    basePrice: 12.9,
    price: 12.9,
    available: true,
    allergens: [ALLERGENS.egg],
    course: 'main',
    type: 'platter',
    modifierGroupIds: ['platter-remove', 'platter-extras'],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
    platterComponents: [
      { id: 'platter-loin', name: 'Lomo', productId: 'product-17', quantity: 1, removable: false, replaceable: false },
      { id: 'platter-egg', name: 'Huevo', quantity: 1, removable: true, replaceable: false },
      { id: 'platter-fries', name: 'Patatas fritas', productId: 'product-13', quantity: 1, removable: true, replaceable: false },
      { id: 'platter-salad', name: 'Ensalada', productId: 'product-5', quantity: 1, removable: true, replaceable: false },
    ],
  },
  {
    id: 'product-18',
    name: { es: 'Plato combinado de pollo', en: 'Chicken Platter', ca: 'Plat combinat de pollastre' },
    description: {
      es: 'Plato combinado con pollo, huevo, patatas fritas y ensalada.',
      en: 'Combined plate with chicken, egg, fries, and salad.',
      ca: 'Plat combinat amb pollastre, ou, patates fregides i amanida.',
    },
    categoryId: 'platters',
    basePrice: 12.5,
    price: 12.5,
    available: true,
    allergens: [ALLERGENS.egg],
    course: 'main',
    type: 'platter',
    modifierGroupIds: ['platter-remove', 'platter-extras'],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
    platterComponents: [
      { id: 'platter-chicken', name: 'Pollo', productId: 'product-18', quantity: 1, removable: false, replaceable: false },
      { id: 'platter-chicken-egg', name: 'Huevo', quantity: 1, removable: true, replaceable: false },
      { id: 'platter-chicken-fries', name: 'Patatas fritas', productId: 'product-13', quantity: 1, removable: true, replaceable: false },
      { id: 'platter-chicken-salad', name: 'Ensalada', productId: 'product-5', quantity: 1, removable: true, replaceable: false },
    ],
  },
  {
    id: 'product-19',
    name: { es: 'Plato combinado vegetal', en: 'Vegetable Platter', ca: 'Plat combinat vegetal' },
    description: {
      es: 'Plato combinado vegetal con huevo, patatas fritas, ensalada y verduras.',
      en: 'Vegetable combined plate with egg, fries, salad, and vegetables.',
      ca: 'Plat combinat vegetal amb ou, patates fregides, amanida i verdures.',
    },
    categoryId: 'platters',
    basePrice: 11.9,
    price: 11.9,
    available: true,
    allergens: [ALLERGENS.egg],
    course: 'main',
    type: 'platter',
    modifierGroupIds: [],
    preparationPolicy: PREPARATION_POLICIES.kitchen,
    platterComponents: [
      { id: 'platter-veggie-egg', name: 'Huevo', quantity: 1, removable: true, replaceable: false },
      { id: 'platter-veggie-fries', name: 'Patatas fritas', productId: 'product-13', quantity: 1, removable: true, replaceable: false },
      { id: 'platter-veggie-salad', name: 'Ensalada', productId: 'product-5', quantity: 1, removable: true, replaceable: false },
      { id: 'platter-veggie-vegetables', name: 'Verduras', quantity: 1, removable: true, replaceable: false },
    ],
  },
];

export const MOCK_COMBO_PRODUCT_DEFINITION_SOURCES: ComboProductDefinitionSource[] = [
  {
    productId: 'product-16',
    pricingMode: 'base_plus_supplements',
    supplements: [
      { slotId: 'combo-burger', productId: 'product-7', supplementPrice: 2 },
      { slotId: 'combo-side', productId: 'product-9', supplementPrice: 1 },
      { slotId: 'combo-drink', productId: 'product-11', supplementPrice: 1.5 },
    ],
    slots: [
      {
        id: 'combo-burger',
        name: { es: 'Hamburguesa', en: 'Burger', ca: 'Hamburguesa' },
        required: true,
        minSelections: 1,
        maxSelections: 1,
        allowedProductIds: ['product-12', 'product-7', 'product-8'],
        defaultProductId: 'product-12',
      },
      {
        id: 'combo-side',
        name: { es: 'Acompanamiento', en: 'Side', ca: 'Acompanyament' },
        required: true,
        minSelections: 1,
        maxSelections: 1,
        allowedProductIds: ['product-13', 'product-9', 'product-5'],
        defaultProductId: 'product-13',
      },
      {
        id: 'combo-drink',
        name: { es: 'Bebida', en: 'Drink', ca: 'Beguda' },
        required: true,
        minSelections: 1,
        maxSelections: 1,
        allowedProductIds: ['product-14', 'product-10', 'product-11'],
        defaultProductId: 'product-14',
      },
    ],
  },
];

export const localizeMenuCategories = (locale: AppLocale): MenuCategory[] =>
  MOCK_MENU_CATEGORY_DEFINITIONS.map((category) => ({
    ...category,
    name: localizeText(category.name, locale),
    nameI18n: toNameI18n(category.name),
  }));

export const localizeModifierGroups = (locale: AppLocale): ModifierGroup[] =>
  MOCK_MODIFIER_GROUP_DEFINITIONS.map((group) => {
    const options = group.options.map((option) => ({
      ...option,
      name: localizeText(option.name, locale),
      nameI18n: toNameI18n(option.name),
    }));

    return {
      ...group,
      displayType: deriveModifierGroupDisplayType({ type: group.type, options }),
      name: localizeText(group.name, locale),
      nameI18n: toNameI18n(group.name),
      options,
    };
  });

export const localizeMenuProducts = (locale: AppLocale): Product[] => {
  const categories = localizeMenuCategories(locale);

  return MOCK_MENU_PRODUCT_DEFINITIONS.map(({ name, description, allergens, ...product }) => ({
    ...product,
    name: localizeText(name, locale),
    nameI18n: toNameI18n(name),
    ...(description ? { description: localizeOptionalText(description, locale) } : {}),
    category: categories.find((category) => category.id === product.categoryId)?.name ?? product.categoryId,
    allergens: allergens?.map((allergen) => localizeText(allergen, locale)),
  }));
};

export const localizeComboProductDefinitions = (locale: AppLocale): ComboProductDefinition[] =>
  MOCK_COMBO_PRODUCT_DEFINITION_SOURCES.map((definition) => ({
    ...definition,
    slots: definition.slots.map((slot) => ({
      ...slot,
      name: localizeText(slot.name, locale),
      nameI18n: toNameI18n(slot.name),
    })),
  }));

export const MOCK_MENU_CATEGORIES: MenuCategory[] = localizeMenuCategories('en');
export const MOCK_MODIFIER_GROUPS: ModifierGroup[] = localizeModifierGroups('en');
export const MOCK_MENU_PRODUCTS: Product[] = localizeMenuProducts('en');
export const MOCK_COMBO_PRODUCT_DEFINITIONS: ComboProductDefinition[] = localizeComboProductDefinitions('en');

@Injectable({ providedIn: 'root' })
export class MenuMockService {
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  private readonly _availabilityOverrides = signal<Map<string, boolean>>(new Map());
  private readonly _backendModifierGroups = signal<ModifierGroup[] | null>(null);
  private readonly _backendComboDefinitions = signal<ComboProductDefinition[] | null>(null);

  readonly locale = computed<AppLocale>(() => this.toSupportedLocale(this.activeLang()));
  readonly categories = computed(() => localizeMenuCategories(this.locale()));
  readonly modifierGroups = computed(() => this._backendModifierGroups() ?? localizeModifierGroups(this.locale()));
  readonly products = computed(() => {
    const base = localizeMenuProducts(this.locale());
    const overrides = this._availabilityOverrides();
    if (overrides.size === 0) return base;
    return base.map((p) => (overrides.has(p.id) ? { ...p, available: overrides.get(p.id)! } : p));
  });
  readonly comboProductDefinitions = computed(() => this._backendComboDefinitions() ?? localizeComboProductDefinitions(this.locale()));

  hydrateModifierGroups(groups: ModifierGroup[]): void {
    this._backendModifierGroups.set(groups);
  }

  hydrateComboDefinitions(defs: ComboProductDefinition[]): void {
    this._backendComboDefinitions.set(defs);
  }

  toggleAvailability(productId: string): void {
    const current = this.products().find((p) => p.id === productId);
    if (!current) return;
    this._availabilityOverrides.update((m) => new Map(m).set(productId, !current.available));
  }

  private toSupportedLocale(locale: string): AppLocale {
    return locale === 'en' || locale === 'ca' ? locale : 'es';
  }
}

function localizeText(text: LocalizedText, locale: AppLocale): string {
  return text[locale] ?? text.es;
}

// Expone las tres variantes de nombre de la definicion mock como `nameI18n`,
// igual que hace el backend real, para que el admin (formularios ES/CA/EN)
// se comporte igual en modo demo que contra el API real.
function toNameI18n(text: LocalizedText): NameI18n {
  return { es: text.es, ca: text.ca, en: text.en };
}

function localizeOptionalText(text: LocalizedOptionalText, locale: AppLocale): string | undefined {
  return text[locale] ?? text.es;
}
