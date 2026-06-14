import type { Product } from '../../models/restaurant-pos.models';
import { toProductPickerItem, type ProductPickerItemContext } from './product-picker-item.mapper';

describe('toProductPickerItem', () => {
  const kitchenPolicy = { route: 'kitchen', requiresReadyBeforeServe: true } as const;

  const context: ProductPickerItemContext = {
    favoriteProductIds: ['burger'],
    lastAddedProductId: 'lemonade',
    productQuantities: { burger: 2, combo: 1 },
    formatCurrency: (value) => `${value.toFixed(2)} €`,
    translate: (key, params) => {
      const values: Record<string, string> = {
        'restaurantPos.service.noAllergens': 'Sin alérgenos indicados',
        'restaurantPos.service.customizable': 'Personalizable',
        'restaurantPos.service.combo': 'Menú',
        'restaurantPos.service.platter': 'Plato combinado',
        'restaurantPos.service.soldOut': 'Agotado',
        'restaurantPos.service.productAdded': 'Añadido',
        'restaurantPos.service.addProductAction': 'Añadir',
        'restaurantPos.service.configureProductAction': 'Configurar',
        'restaurantPos.service.configureComboAction': 'Configurar menú',
        'restaurantPos.service.configureProductActionLabel': `Configurar ${String(params?.['name'] ?? '')}`,
        'restaurantPos.service.configureComboActionLabel': `Configurar menú ${String(params?.['name'] ?? '')}`,
        'restaurantPos.service.increaseProductQuantityActionLabel': `Añadir una unidad de ${String(params?.['name'] ?? '')}`,
        'restaurantPos.service.decreaseProductQuantityActionLabel': `Quitar una unidad de ${String(params?.['name'] ?? '')}`,
        'restaurantPos.service.productQuantityLabel': `Cantidad de ${String(params?.['name'] ?? '')}: ${String(params?.['count'] ?? '')}`,
        'restaurantPos.service.addFavoriteProduct': `Añadir ${String(params?.['name'] ?? '')} a favoritos`,
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
      priceLabel: '4.50 €',
      categoryLabel: 'Bebidas',
      allergenLabel: 'Sin alérgenos indicados',
      actionLabel: 'Añadir',
      actionAriaLabel: 'Añadir una unidad de Limonada con gas',
      disabled: false,
      quantity: 0,
      showQuantityControls: false,
      isFavorite: false,
      recentlyAdded: true,
    });
    expect(item.badges.map((badge) => badge.label)).toEqual(['Añadido']);
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
    expect(item.badges.map((badge) => badge.label)).toEqual(['Personalizable']);
  });

  it('maps combo products to configure menu action and hides quantity controls', () => {
    const item = toProductPickerItem(product({ id: 'combo', name: 'Menu Classic Burger', type: 'combo' }), context);

    expect(item.actionLabel).toBe('Configurar menú');
    expect(item.actionAriaLabel).toBe('Configurar menú Menu Classic Burger');
    expect(item.quantity).toBe(1);
    expect(item.showQuantityControls).toBe(false);
    expect(item.badges.map((badge) => badge.label)).toEqual(['Menú']);
  });

  it('maps platters as add or configure depending on modifiers', () => {
    const simplePlatter = toProductPickerItem(product({ type: 'platter' }), context);
    const customizablePlatter = toProductPickerItem(product({ type: 'platter', modifierGroupIds: ['platter-extras'] }), context);

    expect(simplePlatter.actionLabel).toBe('Añadir');
    expect(customizablePlatter.actionLabel).toBe('Configurar');
    expect(simplePlatter.badges.map((badge) => badge.label)).toEqual(['Plato combinado', 'Añadido']);
  });

  it('marks unavailable products as disabled and sold out', () => {
    const item = toProductPickerItem(product({ id: 'sold-out', available: false }), context);

    expect(item.disabled).toBe(true);
    expect(item.canIncrement).toBe(false);
    expect(item.rowClass).toContain('opacity-60');
    expect(item.badges.map((badge) => badge.label)).toEqual(['Agotado']);
  });
});
