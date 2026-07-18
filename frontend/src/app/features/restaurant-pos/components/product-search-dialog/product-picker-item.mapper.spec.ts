import type { Product } from '../../models/restaurant-pos.models';
import { toProductPickerItem, type ProductPickerItemContext } from './product-picker-item.mapper';

describe('toProductPickerItem', () => {
  const kitchenPolicy = { route: 'kitchen', requiresReadyBeforeServe: true } as const;

  const context: ProductPickerItemContext = {
    favoriteProductIds: ['burger'],
    bestSellerProductIds: ['burger', 'combo'],
    lastAddedProductId: 'lemonade',
    productQuantities: { burger: 2, combo: 1 },
    configuredLines: [],
    formatCurrency: (value) => `${value.toFixed(2)} EUR`,
    translate: (key, params) => {
      const values: Record<string, string> = {
        'restaurantPos.service.noAllergens': 'Sin alergenos indicados',
        'restaurantPos.service.customizable': 'Personalizable',
        'restaurantPos.service.combo': 'Menu',
        'restaurantPos.service.platter': 'Plato combinado',
        'restaurantPos.service.soldOut': 'Agotado',
        'restaurantPos.service.favoriteBadge': 'Favorito',
        'restaurantPos.service.bestSellerBadge': 'Mas vendido',
        'restaurantPos.service.productAdded': 'Anadido',
        'restaurantPos.service.addProductAction': 'Anadir',
        'restaurantPos.service.configureProductAction': 'Configurar',
        'restaurantPos.service.configureComboAction': 'Configurar menu',
        'restaurantPos.service.configurePlatterAction': 'Configurar plato',
        'restaurantPos.service.configureProductActionLabel': `Configurar ${String(params?.['name'] ?? '')}`,
        'restaurantPos.service.configureComboActionLabel': `Configurar menu ${String(params?.['name'] ?? '')}`,
        'restaurantPos.service.configurePlatterActionLabel': `Configurar plato ${String(params?.['name'] ?? '')}`,
        'restaurantPos.service.increaseProductQuantityActionLabel': `Anadir una unidad de ${String(params?.['name'] ?? '')}`,
        'restaurantPos.service.decreaseProductQuantityActionLabel': `Quitar una unidad de ${String(params?.['name'] ?? '')}`,
        'restaurantPos.service.productQuantityLabel': `Cantidad de ${String(params?.['name'] ?? '')}: ${String(params?.['count'] ?? '')}`,
        'restaurantPos.service.addFavoriteProduct': `Anadir ${String(params?.['name'] ?? '')} a favoritos`,
        'restaurantPos.service.removeFavoriteProduct': `Quitar ${String(params?.['name'] ?? '')} de favoritos`,
      };

      return values[key] ?? key;
    },
  };

  const product = (overrides: Partial<Product>): Product => ({
    id: 'lemonade',
    name: 'Limonada con gas',
    categoryId: 'drinks',
    category: 'Bebidas',
    basePrice: 4.5,
    price: 4.5,
    available: true,
    course: 'drinks',
    type: 'simple',
    modifierGroupIds: [],
    preparationPolicy: kitchenPolicy,
    ...overrides,
  });

  it('maps simple products to add action without quantity controls when quantity is zero', () => {
    const item = toProductPickerItem(product({}), context);

    expect(item).toMatchObject({
      id: 'lemonade',
      name: 'Limonada con gas',
      priceLabel: '4.50 EUR',
      categoryLabel: 'Bebidas',
      allergenLabel: 'Sin alergenos indicados',
      description: '',
      actionLabel: 'Anadir',
      actionAriaLabel: 'Anadir una unidad de Limonada con gas',
      disabled: false,
      quantity: 0,
      showQuantityControls: false,
      isFavorite: false,
      recentlyAdded: true,
    });
    expect(item.badges.map((badge) => badge.label)).toEqual(['Anadido']);
  });

  it('expone la imagen del producto cuando está disponible', () => {
    const item = toProductPickerItem(product({ imageUrl: 'https://cdn.example/limonada.webp' }), context);

    expect(item.imageUrl).toBe('https://cdn.example/limonada.webp');
  });

  it('deja la imagen a null cuando el producto no tiene imagen', () => {
    const item = toProductPickerItem(product({}), context);

    expect(item.imageUrl).toBeNull();
  });

  it('maps customizable products to configure action and quantity controls when already added', () => {
    const item = toProductPickerItem(product({ id: 'burger', name: 'Hamburguesa craft', modifierGroupIds: ['extras'] }), context);

    expect(item.actionLabel).toBe('Configurar');
    expect(item.actionAriaLabel).toBe('Configurar Hamburguesa craft');
    expect(item.quantity).toBe(2);
    expect(item.showQuantityControls).toBe(true);
    expect(item.isFavorite).toBe(true);
    expect(item.favoriteAriaLabel).toBe('Quitar Hamburguesa craft de favoritos');
    expect(item.quantityLabel).toBe('Cantidad de Hamburguesa craft: 2');
    expect(item.badges.map((badge) => badge.label)).toEqual(['Personalizable', 'Favorito', 'Mas vendido']);
  });

  it('maps combo products to configure menu action and hides quantity controls', () => {
    const item = toProductPickerItem(product({ id: 'combo', name: 'Menu Classic Burger', type: 'combo' }), context);

    expect(item.actionLabel).toBe('Configurar menu');
    expect(item.actionAriaLabel).toBe('Configurar menu Menu Classic Burger');
    expect(item.quantity).toBe(1);
    expect(item.showQuantityControls).toBe(false);
    expect(item.badges.map((badge) => badge.label)).toEqual(['Menu', 'Mas vendido']);
  });

  it('maps platters as add or configure platter depending on modifiers', () => {
    const simplePlatter = toProductPickerItem(product({ type: 'platter' }), context);
    const customizablePlatter = toProductPickerItem(product({ type: 'platter', modifierGroupIds: ['platter-extras'] }), context);

    expect(simplePlatter.actionLabel).toBe('Anadir');
    expect(customizablePlatter.actionLabel).toBe('Configurar plato');
    expect(customizablePlatter.actionAriaLabel).toBe('Configurar plato Limonada con gas');
    expect(simplePlatter.badges.map((badge) => badge.label)).toEqual(['Plato combinado', 'Anadido']);
  });

  it('marks unavailable products as disabled and sold out', () => {
    const item = toProductPickerItem(product({ id: 'sold-out', available: false }), context);

    expect(item.disabled).toBe(true);
    expect(item.canIncrement).toBe(false);
    expect(item.rowClass).toContain('opacity-60');
    expect(item.badges.map((badge) => badge.label)).toEqual(['Agotado']);
  });
});
