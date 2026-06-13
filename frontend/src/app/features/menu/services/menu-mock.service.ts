import { computed, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { AppLocale } from '../../../shared/i18n/locale.types';
import type { MenuCategory, ModifierGroup, ModifierOption, Product } from '../models/menu.models';

type LocalizedText = Record<AppLocale, string>;
type LocalizedOptionalText = Partial<Record<AppLocale, string>>;

type MenuCategoryDefinition = Omit<MenuCategory, 'name'> & {
  name: LocalizedText;
};

type ModifierOptionDefinition = Omit<ModifierOption, 'name'> & {
  name: LocalizedText;
};

type ModifierGroupDefinition = Omit<ModifierGroup, 'name' | 'options'> & {
  name: LocalizedText;
  options: ModifierOptionDefinition[];
};

type ProductDefinition = Omit<Product, 'name' | 'description' | 'category' | 'allergens'> & {
  name: LocalizedText;
  description?: LocalizedOptionalText;
  allergens?: LocalizedText[];
};

export const MOCK_MENU_CATEGORY_DEFINITIONS: MenuCategoryDefinition[] = [
  { id: 'drinks', name: { es: 'Bebidas', en: 'Drinks', ca: 'Begudes' }, sortOrder: 10 },
  { id: 'tapas', name: { es: 'Tapas', en: 'Tapas', ca: 'Tapes' }, sortOrder: 20 },
  { id: 'burgers', name: { es: 'Hamburguesas', en: 'Burgers', ca: 'Hamburgueses' }, sortOrder: 30 },
  { id: 'burgers-classic', name: { es: 'Clásicas', en: 'Classic', ca: 'Clàssiques' }, parentId: 'burgers', sortOrder: 31 },
  { id: 'burgers-premium', name: { es: 'Premium', en: 'Premium', ca: 'Premium' }, parentId: 'burgers', sortOrder: 32 },
  { id: 'burgers-veggie', name: { es: 'Vegetales', en: 'Veggie', ca: 'Vegetals' }, parentId: 'burgers', sortOrder: 33 },
  { id: 'salads', name: { es: 'Ensaladas', en: 'Salads', ca: 'Amanides' }, sortOrder: 40 },
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
      { id: 'extra-bacon', name: { es: 'Bacon', en: 'Bacon', ca: 'Bacó' }, priceDelta: 1.5 },
      { id: 'extra-cheese', name: { es: 'Queso', en: 'Cheese', ca: 'Formatge' }, priceDelta: 1 },
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
];

const ALLERGENS = {
  gluten: { es: 'gluten', en: 'gluten', ca: 'gluten' },
  milk: { es: 'leche', en: 'milk', ca: 'llet' },
  egg: { es: 'huevo', en: 'egg', ca: 'ou' },
  fish: { es: 'pescado', en: 'fish', ca: 'peix' },
} as const satisfies Record<string, LocalizedText>;

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
    allergens: [ALLERGENS.gluten, ALLERGENS.milk, ALLERGENS.egg],
    course: 'main',
    type: 'simple',
    modifierGroupIds: ['burger-extras', 'burger-remove', 'burger-point'],
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
  },
];

export const localizeMenuCategories = (locale: AppLocale): MenuCategory[] =>
  MOCK_MENU_CATEGORY_DEFINITIONS.map((category) => ({
    ...category,
    name: localizeText(category.name, locale),
  }));

export const localizeModifierGroups = (locale: AppLocale): ModifierGroup[] =>
  MOCK_MODIFIER_GROUP_DEFINITIONS.map((group) => ({
    ...group,
    name: localizeText(group.name, locale),
    options: group.options.map((option) => ({
      ...option,
      name: localizeText(option.name, locale),
    })),
  }));

export const localizeMenuProducts = (locale: AppLocale): Product[] => {
  const categories = localizeMenuCategories(locale);

  return MOCK_MENU_PRODUCT_DEFINITIONS.map(({ name, description, allergens, ...product }) => ({
    ...product,
    name: localizeText(name, locale),
    ...(description ? { description: localizeOptionalText(description, locale) } : {}),
    category: categories.find((category) => category.id === product.categoryId)?.name ?? product.categoryId,
    allergens: allergens?.map((allergen) => localizeText(allergen, locale)),
  }));
};

export const MOCK_MENU_CATEGORIES: MenuCategory[] = localizeMenuCategories('en');
export const MOCK_MODIFIER_GROUPS: ModifierGroup[] = localizeModifierGroups('en');
export const MOCK_MENU_PRODUCTS: Product[] = localizeMenuProducts('en');

@Injectable({ providedIn: 'root' })
export class MenuMockService {
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  readonly locale = computed<AppLocale>(() => this.toSupportedLocale(this.activeLang()));
  readonly categories = computed(() => localizeMenuCategories(this.locale()));
  readonly modifierGroups = computed(() => localizeModifierGroups(this.locale()));
  readonly products = computed(() => localizeMenuProducts(this.locale()));

  private toSupportedLocale(locale: string): AppLocale {
    return locale === 'en' || locale === 'ca' ? locale : 'es';
  }
}

function localizeText(text: LocalizedText, locale: AppLocale): string {
  return text[locale] ?? text.es;
}

function localizeOptionalText(text: LocalizedOptionalText, locale: AppLocale): string | undefined {
  return text[locale] ?? text.es;
}
