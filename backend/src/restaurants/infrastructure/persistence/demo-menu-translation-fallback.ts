import type { NameI18n, RestaurantMenu } from '../../domain/restaurant-read.models';

const DEMO_RESTAURANT_ID = 'restaurant-mesaflow-centro';

const SECTION_NAME_I18N: Record<string, NameI18n> = {
  Bebidas: { es: 'Bebidas', ca: 'Begudes', en: 'Drinks' },
  Tapas: { es: 'Tapas', ca: 'Tapes', en: 'Tapas' },
  Hamburguesas: { es: 'Hamburguesas', ca: 'Hamburgueses', en: 'Burgers' },
  Ensaladas: { es: 'Ensaladas', ca: 'Amanides', en: 'Salads' },
  'Platos combinados': { es: 'Platos combinados', ca: 'Plats combinats', en: 'Platters' },
  Postres: { es: 'Postres', ca: 'Postres', en: 'Desserts' },
  Café: { es: 'Café', ca: 'Cafè', en: 'Coffee' },
  'Cafe solo': { es: 'Cafe solo', ca: 'Cafè sol', en: 'Espresso' },
  Menús: { es: 'Menús', ca: 'Menús', en: 'Menus' },
};

const ITEM_NAME_I18N: Record<string, NameI18n> = {
  'Coca-Cola': { es: 'Coca-Cola', ca: 'Coca-Cola', en: 'Coke' },
  'Agua mineral': { es: 'Agua mineral', ca: 'Aigua mineral', en: 'Mineral water' },
  Cerveza: { es: 'Cerveza', ca: 'Cervesa', en: 'Beer' },
  'Limonada con gas': { es: 'Limonada con gas', ca: 'Llimonada amb gas', en: 'Sparkling Lemonade' },
  'Vino tinto copa': { es: 'Vino tinto copa', ca: 'Copa de vi negre', en: 'Glass of red wine' },
  'Hamburguesa craft': { es: 'Hamburguesa craft', ca: 'Hamburguesa craft', en: 'Craft burger' },
  'Hamburguesa clasica': { es: 'Hamburguesa clasica', ca: 'Hamburguesa clàssica', en: 'Classic burger' },
  'Hamburguesa clásica': { es: 'Hamburguesa clásica', ca: 'Hamburguesa clàssica', en: 'Classic burger' },
  'Hamburguesa trufada': { es: 'Hamburguesa trufada', ca: 'Hamburguesa trufada', en: 'Truffle burger' },
  'Hamburguesa vegetal': { es: 'Hamburguesa vegetal', ca: 'Hamburguesa vegetal', en: 'Veggie burger' },
  'Croquetas de jamon iberico': { es: 'Croquetas de jamon iberico', ca: 'Croquetes de pernil ibèric', en: 'Iberian ham croquettes' },
  'Croquetas de jamón ibérico': { es: 'Croquetas de jamón ibérico', ca: 'Croquetes de pernil ibèric', en: 'Iberian ham croquettes' },
  'Patatas bravas': { es: 'Patatas bravas', ca: 'Patates braves', en: 'Patatas bravas' },
  'Nachos caseros': { es: 'Nachos caseros', ca: 'Nachos casolans', en: 'Homemade nachos' },
  'Patatas fritas': { es: 'Patatas fritas', ca: 'Patates fregides', en: 'Fries' },
  'Ensalada cesar': { es: 'Ensalada cesar', ca: 'Amanida Cèsar', en: 'Caesar salad' },
  'Ensalada César': { es: 'Ensalada César', ca: 'Amanida Cèsar', en: 'Caesar salad' },
  Ensalada: { es: 'Ensalada', ca: 'Amanida', en: 'Salad' },
  'Plato combinado de lomo': { es: 'Plato combinado de lomo', ca: 'Plat combinat de llom', en: 'Pork loin platter' },
  'Plato combinado de pollo': { es: 'Plato combinado de pollo', ca: 'Plat combinat de pollastre', en: 'Chicken platter' },
  'Plato combinado vegetal': { es: 'Plato combinado vegetal', ca: 'Plat combinat vegetal', en: 'Vegetable platter' },
  'Tarta de queso': { es: 'Tarta de queso', ca: 'Pastís de formatge', en: 'Cheesecake' },
  'Coulant de chocolate': { es: 'Coulant de chocolate', ca: 'Coulant de xocolata', en: 'Chocolate coulant' },
  'Cafe solo': { es: 'Cafe solo', ca: 'Cafè sol', en: 'Espresso' },
  'Café solo': { es: 'Café solo', ca: 'Cafè sol', en: 'Espresso' },
  'Cafe con leche': { es: 'Cafe con leche', ca: 'Cafè amb llet', en: 'Coffee with milk' },
  'Café con leche': { es: 'Café con leche', ca: 'Cafè amb llet', en: 'Coffee with milk' },
  'Menu Classic Burger': { es: 'Menu Classic Burger', ca: 'Menu Classic Burger', en: 'Classic Burger Menu' },
  'Sandwich club': { es: 'Sandwich club', ca: 'Sandvitx club', en: 'Club sandwich' },
};

const DESCRIPTION_I18N: Record<string, NameI18n> = {
  'Hamburguesa de ternera con lechuga, tomate, cebolla, pepinillos y salsa de la casa.': {
    es: 'Hamburguesa de ternera con lechuga, tomate, cebolla, pepinillos y salsa de la casa.',
    ca: 'Hamburguesa de vedella amb enciam, tomàquet, ceba, cogombrets i salsa de la casa.',
    en: 'Beef burger with lettuce, tomato, onion, pickles, and house sauce.',
  },
  'Hamburguesa clásica con queso, lechuga y tomate.': {
    es: 'Hamburguesa clásica con queso, lechuga y tomate.',
    ca: 'Hamburguesa clàssica amb formatge, enciam i tomàquet.',
    en: 'Classic burger with cheese, lettuce, and tomato.',
  },
  'Hamburguesa premium con queso de trufa y cebolla caramelizada.': {
    es: 'Hamburguesa premium con queso de trufa y cebolla caramelizada.',
    ca: 'Hamburguesa premium amb formatge de tòfona i ceba caramel·litzada.',
    en: 'Premium burger with truffle cheese and caramelized onion.',
  },
  'Hamburguesa vegetal con aguacate y pimientos asados.': {
    es: 'Hamburguesa vegetal con aguacate y pimientos asados.',
    ca: 'Hamburguesa vegetal amb alvocat i pebrots rostits.',
    en: 'Veggie burger with avocado and roasted peppers.',
  },
  'Croquetas caseras de jamón ibérico de bellota.': {
    es: 'Croquetas caseras de jamón ibérico de bellota.',
    ca: "Croquetes casolanes de pernil ibèric d'aglà.",
    en: 'Homemade acorn-fed Iberian ham croquettes.',
  },
  'Totopos con cheddar fundido y pico de gallo.': {
    es: 'Totopos con cheddar fundido y pico de gallo.',
    ca: 'Totopos amb cheddar fos i pico de gallo.',
    en: 'Tortilla chips with melted cheddar and pico de gallo.',
  },
  'Lechuga romana, pollo a la plancha, anchoas y aliño César.': {
    es: 'Lechuga romana, pollo a la plancha, anchoas y aliño César.',
    ca: 'Enciam romà, pollastre a la planxa, anxoves i amaniment Cèsar.',
    en: 'Romaine lettuce, grilled chicken, anchovies, and Caesar dressing.',
  },
  'Lomo a la plancha con huevo, patatas fritas y ensalada.': {
    es: 'Lomo a la plancha con huevo, patatas fritas y ensalada.',
    ca: 'Llom a la planxa amb ou, patates fregides i amanida.',
    en: 'Grilled pork loin with egg, fries, and salad.',
  },
  'Pollo a la plancha con huevo, patatas fritas y ensalada.': {
    es: 'Pollo a la plancha con huevo, patatas fritas y ensalada.',
    ca: 'Pollastre a la planxa amb ou, patates fregides i amanida.',
    en: 'Grilled chicken with egg, fries, and salad.',
  },
  'Huevo, patatas fritas, ensalada y verduras de temporada.': {
    es: 'Huevo, patatas fritas, ensalada y verduras de temporada.',
    ca: 'Ou, patates fregides, amanida i verdures de temporada.',
    en: 'Egg, fries, salad, and seasonal vegetables.',
  },
  'Bizcocho de chocolate con interior fundido y helado de vainilla.': {
    es: 'Bizcocho de chocolate con interior fundido y helado de vainilla.',
    ca: 'Pa de pessic de xocolata amb interior fos i gelat de vainilla.',
    en: 'Chocolate sponge cake with a molten center and vanilla ice cream.',
  },
  'Hamburguesa a elegir, bebida y acompañamiento.': {
    es: 'Hamburguesa a elegir, bebida y acompañamiento.',
    ca: 'Hamburguesa a escollir, beguda i acompanyament.',
    en: 'Choose a burger, a drink, and a side.',
  },
};

const MODIFIER_GROUP_NAME_I18N: Record<string, NameI18n> = {
  'Extras de hamburguesa': { es: 'Extras de hamburguesa', ca: "Extres d'hamburguesa", en: 'Burger extras' },
  'Quitar ingredientes hamburguesa': { es: 'Quitar ingredientes hamburguesa', ca: "Treure ingredients d'hamburguesa", en: 'Remove burger ingredients' },
  'Punto de la carne': { es: 'Punto de la carne', ca: 'Punt de la carn', en: 'Burger point' },
  'Tamaño de bebida': { es: 'Tamaño de bebida', ca: 'Mida de beguda', en: 'Drink size' },
  'Opciones de café': { es: 'Opciones de café', ca: 'Opcions de cafè', en: 'Coffee options' },
  'Quitar ingredientes plato': { es: 'Quitar ingredientes plato', ca: 'Treure ingredients del plat', en: 'Remove platter ingredients' },
  'Extras de plato combinado': { es: 'Extras de plato combinado', ca: 'Extres de plat combinat', en: 'Platter extras' },
};

const MODIFIER_OPTION_NAME_I18N: Record<string, NameI18n> = {
  Bacon: { es: 'Bacon', ca: 'Bacon', en: 'Bacon' },
  'Queso extra': { es: 'Queso extra', ca: 'Formatge extra', en: 'Extra cheese' },
  Huevo: { es: 'Huevo', ca: 'Ou', en: 'Egg' },
  'Sin cebolla': { es: 'Sin cebolla', ca: 'Sense ceba', en: 'No onion' },
  'Sin pepinillos': { es: 'Sin pepinillos', ca: 'Sense cogombrets', en: 'No pickles' },
  'Sin salsa': { es: 'Sin salsa', ca: 'Sense salsa', en: 'No sauce' },
  'Poco hecha': { es: 'Poco hecha', ca: 'Poc feta', en: 'Rare' },
  'Al punto': { es: 'Al punto', ca: 'Al punt', en: 'Medium' },
  'Muy hecha': { es: 'Muy hecha', ca: 'Molt feta', en: 'Well done' },
  Mediana: { es: 'Mediana', ca: 'Mitjana', en: 'Medium' },
  Grande: { es: 'Grande', ca: 'Gran', en: 'Large' },
  XL: { es: 'XL', ca: 'XL', en: 'XL' },
  'Carga extra': { es: 'Carga extra', ca: 'Càrrega extra', en: 'Extra shot' },
  'Bebida de avena': { es: 'Bebida de avena', ca: 'Beguda de civada', en: 'Oat drink' },
  Descafeinado: { es: 'Descafeinado', ca: 'Descafeïnat', en: 'Decaf' },
  'Sin huevo': { es: 'Sin huevo', ca: 'Sense ou', en: 'No egg' },
  'Sin patatas': { es: 'Sin patatas', ca: 'Sense patates', en: 'No fries' },
  'Sin ensalada': { es: 'Sin ensalada', ca: 'Sense amanida', en: 'No salad' },
  'Huevo extra': { es: 'Huevo extra', ca: 'Ou extra', en: 'Extra egg' },
  'Patatas extra': { es: 'Patatas extra', ca: 'Patates extra', en: 'Extra fries' },
  'Salsa extra': { es: 'Salsa extra', ca: 'Salsa extra', en: 'Extra sauce' },
};

const COMBO_SLOT_NAME_I18N: Record<string, NameI18n> = {
  Hamburguesa: { es: 'Hamburguesa', ca: 'Hamburguesa', en: 'Burger' },
  Bebida: { es: 'Bebida', ca: 'Beguda', en: 'Drink' },
  Acompañamiento: { es: 'Acompañamiento', ca: 'Acompanyament', en: 'Side' },
};

const PLATTER_COMPONENT_NAME_I18N: Record<string, NameI18n> = {
  Lomo: { es: 'Lomo', ca: 'Llom', en: 'Pork loin' },
  Pollo: { es: 'Pollo', ca: 'Pollastre', en: 'Chicken' },
  Huevo: { es: 'Huevo', ca: 'Ou', en: 'Egg' },
  'Patatas fritas': { es: 'Patatas fritas', ca: 'Patates fregides', en: 'Fries' },
  Ensalada: { es: 'Ensalada', ca: 'Amanida', en: 'Salad' },
  'Verduras de temporada': { es: 'Verduras de temporada', ca: 'Verdures de temporada', en: 'Seasonal vegetables' },
  Verduras: { es: 'Verduras', ca: 'Verdures', en: 'Vegetables' },
};

export function applyDemoMenuTranslationFallback(menu: RestaurantMenu): RestaurantMenu {
  if (menu.restaurantId !== DEMO_RESTAURANT_ID) {
    return menu;
  }

  return {
    ...menu,
    sections: menu.sections.map((section) => ({
      ...section,
      nameI18n: section.nameI18n ?? SECTION_NAME_I18N[section.name],
      items: section.items.map((item) => ({
        ...item,
        nameI18n: item.nameI18n ?? ITEM_NAME_I18N[item.name],
        descriptionI18n: item.descriptionI18n ?? (item.description ? DESCRIPTION_I18N[item.description] : undefined),
        modifierGroups: item.modifierGroups?.map((group) => ({
          ...group,
          nameI18n: group.nameI18n ?? MODIFIER_GROUP_NAME_I18N[group.name],
          options: group.options.map((option) => ({
            ...option,
            nameI18n: option.nameI18n ?? MODIFIER_OPTION_NAME_I18N[option.name],
          })),
        })),
        comboDefinition: item.comboDefinition
          ? {
              ...item.comboDefinition,
              slots: item.comboDefinition.slots.map((slot) => ({
                ...slot,
                nameI18n: slot.nameI18n ?? COMBO_SLOT_NAME_I18N[slot.name],
              })),
            }
          : item.comboDefinition,
        platterComponents: item.platterComponents?.map((component) => ({
          ...component,
          nameI18n: component.nameI18n ?? PLATTER_COMPONENT_NAME_I18N[component.name],
        })),
      })),
    })),
  };
}
