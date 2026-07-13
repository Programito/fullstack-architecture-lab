import type { NameI18n, RestaurantMenu } from '../../domain/restaurant-read.models';

const DEMO_RESTAURANT_ID = 'restaurant-mesaflow-centro';

type TranslationEntry = {
  key: string;
  value: NameI18n;
  aliases?: string[];
};

function buildLookup(entries: TranslationEntry[]): Record<string, NameI18n> {
  const lookup: Record<string, NameI18n> = {};

  for (const entry of entries) {
    lookup[entry.key] = entry.value;
    for (const alias of entry.aliases ?? []) {
      lookup[alias] = entry.value;
    }
  }

  return lookup;
}

const SECTION_NAME_I18N = buildLookup([
  { key: 'Bebidas', value: { es: 'Bebidas', ca: 'Begudes', en: 'Drinks' } },
  { key: 'Tapas', value: { es: 'Tapas', ca: 'Tapes', en: 'Tapas' } },
  { key: 'Hamburguesas', value: { es: 'Hamburguesas', ca: 'Hamburgueses', en: 'Burgers' } },
  { key: 'Ensaladas', value: { es: 'Ensaladas', ca: 'Amanides', en: 'Salads' } },
  { key: 'Platos combinados', value: { es: 'Platos combinados', ca: 'Plats combinats', en: 'Platters' } },
  { key: 'Postres', value: { es: 'Postres', ca: 'Postres', en: 'Desserts' } },
  {
    key: 'Caf\u00e9',
    value: { es: 'Caf\u00e9', ca: 'Caf\u00e8', en: 'Coffee' },
    aliases: ['Cafe', 'CafÃ©', 'CafÃƒÂ©'],
  },
  {
    key: 'Men\u00fas',
    value: { es: 'Men\u00fas', ca: 'Men\u00fas', en: 'Menus' },
    aliases: ['Menus', 'MenÃºs', 'MenÃƒÂºs'],
  },
]);

const ITEM_NAME_I18N = buildLookup([
  { key: 'Coca-Cola', value: { es: 'Coca-Cola', ca: 'Coca-Cola', en: 'Coke' } },
  { key: 'Agua mineral', value: { es: 'Agua mineral', ca: 'Aigua mineral', en: 'Mineral water' } },
  { key: 'Cerveza', value: { es: 'Cerveza', ca: 'Cervesa', en: 'Beer' } },
  { key: 'Limonada con gas', value: { es: 'Limonada con gas', ca: 'Llimonada amb gas', en: 'Sparkling lemonade' } },
  { key: 'Vino tinto copa', value: { es: 'Vino tinto copa', ca: 'Copa de vi negre', en: 'Glass of red wine' } },
  { key: 'Hamburguesa craft', value: { es: 'Hamburguesa craft', ca: 'Hamburguesa craft', en: 'Craft burger' } },
  {
    key: 'Hamburguesa clasica',
    value: { es: 'Hamburguesa cl\u00e1sica', ca: 'Hamburguesa cl\u00e0ssica', en: 'Classic burger' },
    aliases: ['Hamburguesa clásica', 'Hamburguesa clÃ¡sica', 'Hamburguesa cl?sica'],
  },
  { key: 'Hamburguesa trufada', value: { es: 'Hamburguesa trufada', ca: 'Hamburguesa trufada', en: 'Truffle burger' } },
  { key: 'Hamburguesa vegetal', value: { es: 'Hamburguesa vegetal', ca: 'Hamburguesa vegetal', en: 'Veggie burger' } },
  {
    key: 'Croquetas de jamon iberico',
    value: {
      es: 'Croquetas de jam\u00f3n ib\u00e9rico',
      ca: 'Croquetes de pernil ib\u00e8ric',
      en: 'Iberian ham croquettes',
    },
    aliases: [
      'Croquetas de jamón ibérico',
      'Croquetas de jamÃ³n ibÃ©rico',
      'Croquetas de jam?n ib?rico',
    ],
  },
  { key: 'Patatas bravas', value: { es: 'Patatas bravas', ca: 'Patates braves', en: 'Patatas bravas' } },
  { key: 'Nachos caseros', value: { es: 'Nachos caseros', ca: 'Nachos casolans', en: 'Homemade nachos' } },
  { key: 'Patatas fritas', value: { es: 'Patatas fritas', ca: 'Patates fregides', en: 'French fries' } },
  {
    key: 'Ensalada cesar',
    value: { es: 'Ensalada C\u00e9sar', ca: 'Amanida C\u00e8sar', en: 'Caesar salad' },
    aliases: ['Ensalada César', 'Ensalada CÃ©sar', 'Ensalada C?sar'],
  },
  { key: 'Ensalada', value: { es: 'Ensalada', ca: 'Amanida', en: 'Salad' } },
  { key: 'Plato combinado de lomo', value: { es: 'Plato combinado de lomo', ca: 'Plat combinat de llom', en: 'Pork loin platter' } },
  { key: 'Plato combinado de pollo', value: { es: 'Plato combinado de pollo', ca: 'Plat combinat de pollastre', en: 'Chicken platter' } },
  { key: 'Plato combinado vegetal', value: { es: 'Plato combinado vegetal', ca: 'Plat combinat vegetal', en: 'Vegetable platter' } },
  { key: 'Tarta de queso', value: { es: 'Tarta de queso', ca: 'Past\u00eds de formatge', en: 'Cheesecake' } },
  { key: 'Coulant de chocolate', value: { es: 'Coulant de chocolate', ca: 'Coulant de xocolata', en: 'Chocolate coulant' } },
  {
    key: 'Cafe solo',
    value: { es: 'Caf\u00e9 solo', ca: 'Caf\u00e8 sol', en: 'Espresso' },
    aliases: ['Café solo', 'CafÃ© solo', 'Caf? solo'],
  },
  {
    key: 'Cafe con leche',
    value: { es: 'Caf\u00e9 con leche', ca: 'Caf\u00e8 amb llet', en: 'Coffee with milk' },
    aliases: ['Café con leche', 'CafÃ© con leche', 'Caf? con leche'],
  },
  {
    key: 'Menu Classic Burger',
    value: { es: 'Men\u00fa Classic Burger', ca: 'Men\u00fa Classic Burger', en: 'Classic Burger Menu' },
    aliases: ['Menú Classic Burger', 'MenÃº Classic Burger', 'Men? Classic Burger'],
  },
  { key: 'Sandwich club', value: { es: 'S\u00e1ndwich club', ca: 'Sandvitx club', en: 'Club sandwich' } },
  { key: 'Lomo', value: { es: 'Lomo', ca: 'Llom', en: 'Pork loin' } },
  { key: 'Huevo', value: { es: 'Huevo', ca: 'Ou', en: 'Egg' } },
  { key: 'Pollo', value: { es: 'Pollo', ca: 'Pollastre', en: 'Chicken' } },
  { key: 'Verduras de temporada', value: { es: 'Verduras de temporada', ca: 'Verdures de temporada', en: 'Seasonal vegetables' } },
]);

const DESCRIPTION_I18N = buildLookup([
  {
    key: 'Hamburguesa clasica con queso, lechuga y tomate.',
    value: {
      es: 'Hamburguesa cl\u00e1sica con queso, lechuga y tomate.',
      ca: 'Hamburguesa cl\u00e0ssica amb formatge, enciam i tom\u00e0quet.',
      en: 'Classic burger with cheese, lettuce, and tomato.',
    },
    aliases: ['Hamburguesa clásica con queso, lechuga y tomate.', 'Hamburguesa clÃ¡sica con queso, lechuga y tomate.', 'Hamburguesa cl?sica con queso, lechuga y tomate.'],
  },
  {
    key: 'Croquetas caseras de jamon iberico de bellota.',
    value: {
      es: 'Croquetas caseras de jam\u00f3n ib\u00e9rico de bellota.',
      ca: 'Croquetes casolanes de pernil ib\u00e8ric de gla.',
      en: 'Homemade acorn-fed Iberian ham croquettes.',
    },
    aliases: ['Croquetas caseras de jamón ibérico de bellota.', 'Croquetas caseras de jamÃ³n ibÃ©rico de bellota.', 'Croquetas caseras de jam?n ib?rico de bellota.'],
  },
  {
    key: 'Lechuga romana, pollo a la plancha, anchoas y aliño Cesar.',
    value: {
      es: 'Lechuga romana, pollo a la plancha, anchoas y ali\u00f1o C\u00e9sar.',
      ca: 'Enciam rom\u00e0, pollastre a la planxa, anxoves i amaniment C\u00e8sar.',
      en: 'Romaine lettuce, grilled chicken, anchovies, and Caesar dressing.',
    },
    aliases: ['Lechuga romana, pollo a la plancha, anchoas y aliño César.', 'Lechuga romana, pollo a la plancha, anchoas y aliÃ±o CÃ©sar.', 'Lechuga romana, pollo a la plancha, anchoas y ali?o C?sar.'],
  },
  {
    key: 'Hamburguesa a elegir, bebida y acompañamiento.',
    value: {
      es: 'Hamburguesa a elegir, bebida y acompa\u00f1amiento.',
      ca: 'Hamburguesa a escollir, beguda i acompanyament.',
      en: 'Choose your burger, drink, and side.',
    },
    aliases: ['Hamburguesa a elegir, bebida y acompaÃ±amiento.', 'Hamburguesa a elegir, bebida y acompa?amiento.'],
  },
]);

const MODIFIER_GROUP_NAME_I18N = buildLookup([
  { key: 'Extras de hamburguesa', value: { es: 'Extras de hamburguesa', ca: "Extres d'hamburguesa", en: 'Burger extras' } },
  { key: 'Quitar ingredientes hamburguesa', value: { es: 'Quitar ingredientes hamburguesa', ca: "Treure ingredients d'hamburguesa", en: 'Remove burger ingredients' } },
  { key: 'Punto de la carne', value: { es: 'Punto de la carne', ca: 'Punt de la carn', en: 'Burger point' } },
  {
    key: 'Tamaño de bebida',
    value: { es: 'Tama\u00f1o de bebida', ca: 'Mida de beguda', en: 'Drink size' },
    aliases: ['TamaÃ±o de bebida', 'Tama?o de bebida'],
  },
  {
    key: 'Opciones de café',
    value: { es: 'Opciones de caf\u00e9', ca: 'Opcions de caf\u00e8', en: 'Coffee options' },
    aliases: ['Opciones de cafe', 'Opciones de cafÃ©', 'Opciones de caf?'],
  },
  { key: 'Quitar ingredientes plato', value: { es: 'Quitar ingredientes plato', ca: 'Treure ingredients del plat', en: 'Remove platter ingredients' } },
  { key: 'Extras de plato combinado', value: { es: 'Extras de plato combinado', ca: 'Extres de plat combinat', en: 'Platter extras' } },
]);

const MODIFIER_OPTION_NAME_I18N = buildLookup([
  { key: 'Bacon', value: { es: 'Bacon', ca: 'Bacon', en: 'Bacon' } },
  { key: 'Queso extra', value: { es: 'Queso extra', ca: 'Formatge extra', en: 'Extra cheese' } },
  { key: 'Huevo', value: { es: 'Huevo', ca: 'Ou', en: 'Egg' } },
  { key: 'Sin cebolla', value: { es: 'Sin cebolla', ca: 'Sense ceba', en: 'No onion' } },
  { key: 'Sin pepinillos', value: { es: 'Sin pepinillos', ca: 'Sense cogombrets', en: 'No pickles' } },
  { key: 'Sin salsa', value: { es: 'Sin salsa', ca: 'Sense salsa', en: 'No sauce' } },
  { key: 'Poco hecha', value: { es: 'Poco hecha', ca: 'Poc feta', en: 'Rare' } },
  { key: 'Al punto', value: { es: 'Al punto', ca: 'Al punt', en: 'Medium' } },
  { key: 'Muy hecha', value: { es: 'Muy hecha', ca: 'Molt feta', en: 'Well done' } },
  { key: 'Mediana', value: { es: 'Mediana', ca: 'Mitjana', en: 'Medium' } },
  { key: 'Grande', value: { es: 'Grande', ca: 'Gran', en: 'Large' } },
  { key: 'XL', value: { es: 'XL', ca: 'XL', en: 'XL' } },
  {
    key: 'Carga extra',
    value: { es: 'Carga extra', ca: 'C\u00e0rrega extra', en: 'Extra shot' },
    aliases: ['CÃ rrega extra'],
  },
  { key: 'Bebida de avena', value: { es: 'Bebida de avena', ca: 'Beguda de civada', en: 'Oat drink' } },
  {
    key: 'Descafeinado',
    value: { es: 'Descafeinado', ca: 'Descafe\u00efnat', en: 'Decaf' },
    aliases: ['DescafeÃ¯nat'],
  },
  { key: 'Sin huevo', value: { es: 'Sin huevo', ca: 'Sense ou', en: 'No egg' } },
  { key: 'Sin patatas', value: { es: 'Sin patatas', ca: 'Sense patates', en: 'No fries' } },
  { key: 'Sin ensalada', value: { es: 'Sin ensalada', ca: 'Sense amanida', en: 'No salad' } },
  { key: 'Huevo extra', value: { es: 'Huevo extra', ca: 'Ou extra', en: 'Extra egg' } },
  { key: 'Patatas extra', value: { es: 'Patatas extra', ca: 'Patates extra', en: 'Extra fries' } },
  { key: 'Salsa extra', value: { es: 'Salsa extra', ca: 'Salsa extra', en: 'Extra sauce' } },
]);

const COMBO_SLOT_NAME_I18N = buildLookup([
  { key: 'Hamburguesa', value: { es: 'Hamburguesa', ca: 'Hamburguesa', en: 'Burger' } },
  { key: 'Bebida', value: { es: 'Bebida', ca: 'Beguda', en: 'Drink' } },
  {
    key: 'Acompañamiento',
    value: { es: 'Acompa\u00f1amiento', ca: 'Acompanyament', en: 'Side' },
    aliases: ['AcompaÃ±amiento', 'Acompa?amiento'],
  },
]);

const PLATTER_COMPONENT_NAME_I18N = buildLookup([
  { key: 'Lomo', value: { es: 'Lomo', ca: 'Llom', en: 'Pork loin' } },
  { key: 'Huevo', value: { es: 'Huevo', ca: 'Ou', en: 'Egg' } },
  { key: 'Patatas fritas', value: { es: 'Patatas fritas', ca: 'Patates fregides', en: 'French fries' } },
  { key: 'Ensalada', value: { es: 'Ensalada', ca: 'Amanida', en: 'Salad' } },
  { key: 'Pollo', value: { es: 'Pollo', ca: 'Pollastre', en: 'Chicken' } },
  { key: 'Verduras de temporada', value: { es: 'Verduras de temporada', ca: 'Verdures de temporada', en: 'Seasonal vegetables' } },
]);

function withFallback(base: NameI18n | undefined, fallback: NameI18n | undefined): NameI18n | undefined {
  if (!base) {
    return fallback;
  }

  if (!fallback) {
    return base;
  }

  return {
    es: base.es ?? fallback.es,
    ca: base.ca ?? fallback.ca,
    en: base.en ?? fallback.en,
  };
}

export function applyDemoMenuTranslationFallback(menu: RestaurantMenu): RestaurantMenu {
  if (menu.restaurantId !== DEMO_RESTAURANT_ID) {
    return menu;
  }

  return {
    ...menu,
    sections: menu.sections.map((section) => ({
      ...section,
      nameI18n: withFallback(section.nameI18n, SECTION_NAME_I18N[section.name]),
      items: section.items.map((item) => ({
        ...item,
        nameI18n: withFallback(item.nameI18n, ITEM_NAME_I18N[item.name]),
        descriptionI18n: withFallback(
          item.descriptionI18n,
          item.description ? DESCRIPTION_I18N[item.description] : undefined,
        ),
        modifierGroups: item.modifierGroups?.map((group) => ({
          ...group,
          nameI18n: withFallback(group.nameI18n, MODIFIER_GROUP_NAME_I18N[group.name]),
          options: group.options.map((option) => ({
            ...option,
            nameI18n: withFallback(option.nameI18n, MODIFIER_OPTION_NAME_I18N[option.name]),
          })),
        })),
        comboDefinition: item.comboDefinition
          ? {
              ...item.comboDefinition,
              slots: item.comboDefinition.slots.map((slot) => ({
                ...slot,
                nameI18n: withFallback(slot.nameI18n, COMBO_SLOT_NAME_I18N[slot.name]),
              })),
            }
          : item.comboDefinition,
        platterComponents: item.platterComponents?.map((component) => ({
          ...component,
          nameI18n: withFallback(component.nameI18n, PLATTER_COMPONENT_NAME_I18N[component.name]),
        })),
      })),
    })),
  };
}
