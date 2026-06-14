import type { Product } from '../../models/restaurant-pos.models';

export type ProductPickerBadgeTone = 'customizable' | 'combo' | 'platter' | 'soldOut' | 'recentlyAdded';

export type ProductPickerBadge = {
  id: ProductPickerBadgeTone;
  label: string;
  className: string;
};

export type ProductPickerItem = {
  id: string;
  name: string;
  priceLabel: string;
  categoryLabel: string;
  allergenLabel: string;
  badges: readonly ProductPickerBadge[];
  actionLabel: string;
  actionAriaLabel: string;
  disabled: boolean;
  quantity: number;
  showQuantityControls: boolean;
  isFavorite: boolean;
  recentlyAdded: boolean;
  favoriteAriaLabel: string;
  quantityLabel: string;
  increaseAriaLabel: string;
  decreaseAriaLabel: string;
  canIncrement: boolean;
  rowClass: string;
};

export type ProductPickerItemContext = {
  favoriteProductIds: readonly string[];
  lastAddedProductId: string | null;
  productQuantities: Readonly<Record<string, number>>;
  formatCurrency: (value: number) => string;
  translate: (key: string, params?: Record<string, unknown>) => string;
};

const BASE_ROW_CLASS =
  'theme-field grid min-h-36 grid-cols-1 items-start gap-4 rounded-lg border px-4 pb-5 pt-4 text-sm transition hover:border-cyan-500/60';

const BADGE_CLASSES: Record<ProductPickerBadgeTone, string> = {
  customizable: 'rounded-full border border-cyan-200 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 dark:border-cyan-900 dark:text-cyan-200',
  combo: 'rounded-full border border-violet-200 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:text-violet-200',
  platter:
    'rounded-full border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:text-emerald-200',
  soldOut: 'rounded-full border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900 dark:text-red-300',
  recentlyAdded:
    'rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
};

export function toProductPickerItem(product: Product, context: ProductPickerItemContext): ProductPickerItem {
  const quantity = context.productQuantities[product.id] ?? 0;
  const isCombo = product.type === 'combo';
  const isCustomizable = product.modifierGroupIds.length > 0;
  const disabled = !product.available;
  const recentlyAdded = context.lastAddedProductId === product.id;
  const isFavorite = context.favoriteProductIds.includes(product.id);
  const nameParams = { name: product.name };
  const countParams = { name: product.name, count: quantity };

  return {
    id: product.id,
    name: product.name,
    priceLabel: context.formatCurrency(product.basePrice ?? product.price ?? 0),
    categoryLabel: product.category ?? product.categoryId,
    allergenLabel: product.allergens?.length ? product.allergens.join(', ') : context.translate('restaurantPos.service.noAllergens'),
    badges: productPickerBadges(product, { isCombo, isCustomizable, recentlyAdded }, context.translate),
    actionLabel: productActionLabel({ isCombo, isCustomizable }, context.translate),
    actionAriaLabel: productActionAriaLabel(product, { isCombo, isCustomizable }, context.translate),
    disabled,
    quantity,
    showQuantityControls: !isCombo && quantity > 0,
    isFavorite,
    recentlyAdded,
    favoriteAriaLabel: context.translate(
      isFavorite ? 'restaurantPos.service.removeFavoriteProduct' : 'restaurantPos.service.addFavoriteProduct',
      nameParams,
    ),
    quantityLabel: context.translate('restaurantPos.service.productQuantityLabel', countParams),
    increaseAriaLabel: context.translate('restaurantPos.service.increaseProductQuantityActionLabel', nameParams),
    decreaseAriaLabel: context.translate('restaurantPos.service.decreaseProductQuantityActionLabel', nameParams),
    canIncrement: product.available && !isCombo,
    rowClass: [
      BASE_ROW_CLASS,
      quantity > 0 || recentlyAdded ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20' : '',
      disabled ? 'opacity-60' : '',
    ].join(' '),
  };
}

function productPickerBadges(
  product: Product,
  state: { isCombo: boolean; isCustomizable: boolean; recentlyAdded: boolean },
  translate: ProductPickerItemContext['translate'],
): ProductPickerBadge[] {
  const badges: ProductPickerBadge[] = [];

  if (state.isCustomizable) {
    badges.push(productPickerBadge('customizable', translate('restaurantPos.service.customizable')));
  }

  if (state.isCombo) {
    badges.push(productPickerBadge('combo', translate('restaurantPos.service.combo')));
  }

  if (product.type === 'platter') {
    badges.push(productPickerBadge('platter', translate('restaurantPos.service.platter')));
  }

  if (!product.available) {
    badges.push(productPickerBadge('soldOut', translate('restaurantPos.service.soldOut')));
  }

  if (state.recentlyAdded) {
    badges.push(productPickerBadge('recentlyAdded', translate('restaurantPos.service.productAdded')));
  }

  return badges;
}

function productPickerBadge(id: ProductPickerBadgeTone, label: string): ProductPickerBadge {
  return {
    id,
    label,
    className: BADGE_CLASSES[id],
  };
}

function productActionLabel(
  state: { isCombo: boolean; isCustomizable: boolean },
  translate: ProductPickerItemContext['translate'],
): string {
  if (state.isCombo) {
    return translate('restaurantPos.service.configureComboAction');
  }

  if (state.isCustomizable) {
    return translate('restaurantPos.service.configureProductAction');
  }

  return translate('restaurantPos.service.addProductAction');
}

function productActionAriaLabel(
  product: Product,
  state: { isCombo: boolean; isCustomizable: boolean },
  translate: ProductPickerItemContext['translate'],
): string {
  if (state.isCombo) {
    return translate('restaurantPos.service.configureComboActionLabel', { name: product.name });
  }

  if (state.isCustomizable) {
    return translate('restaurantPos.service.configureProductActionLabel', { name: product.name });
  }

  return translate('restaurantPos.service.increaseProductQuantityActionLabel', { name: product.name });
}
