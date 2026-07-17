import type { Product } from '../../models/restaurant-pos.models';

export type ProductPickerBadgeTone = 'customizable' | 'combo' | 'platter' | 'soldOut' | 'favorite' | 'bestSeller' | 'recentlyAdded';

export type ProductPickerBadge = {
  id: ProductPickerBadgeTone;
  label: string;
  className: string;
};

export type ProductPickerConfiguredLineInput = {
  lineId: string;
  productId: string;
  quantity: number;
  summary: string;
  total?: number;
};

export type ProductPickerConfiguredLine = ProductPickerConfiguredLineInput & {
  quantityLabel: string;
  increaseAriaLabel: string;
  decreaseAriaLabel: string;
};

export type ProductPickerItem = {
  id: string;
  name: string;
  visualIcon: string;
  visualClass: string;
  priceLabel: string;
  categoryLabel: string;
  allergenLabel: string;
  description: string;
  badges: readonly ProductPickerBadge[];
  actionLabel: string;
  actionAriaLabel: string;
  disabled: boolean;
  quantity: number;
  showQuantityControls: boolean;
  configuredLines: readonly ProductPickerConfiguredLine[];
  configuredLineCount: number;
  hasSingleConfiguredLine: boolean;
  hasMultipleConfiguredLines: boolean;
  orderedSummaryLabel: string;
  newOptionLabel: string;
  newOptionAriaLabel: string;
  viewOptionsLabel: string;
  hideOptionsLabel: string;
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
  bestSellerProductIds: readonly string[];
  lastAddedProductId: string | null;
  productQuantities: Readonly<Record<string, number>>;
  configuredLines: readonly ProductPickerConfiguredLineInput[];
  formatCurrency: (value: number) => string;
  translate: (key: string, params?: Record<string, unknown>) => string;
};

const BASE_ROW_CLASS =
  'theme-field grid min-h-28 grid-cols-1 items-start gap-3 rounded-lg border px-3 py-3 text-sm transition hover:border-cyan-500/60 sm:grid-cols-[3rem_minmax(0,1fr)] sm:px-4';

const BADGE_CLASSES: Record<ProductPickerBadgeTone, string> = {
  customizable: 'rounded-full border border-cyan-200 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 dark:border-cyan-900 dark:text-cyan-200',
  combo: 'rounded-full border border-violet-200 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:text-violet-200',
  platter:
    'rounded-full border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:text-emerald-200',
  soldOut: 'rounded-full border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900 dark:text-red-300',
  favorite: 'rounded-full border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:text-amber-200',
  bestSeller: 'rounded-full border border-sky-200 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-900 dark:text-sky-200',
  recentlyAdded:
    'rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
};

export function toProductPickerItem(product: Product, context: ProductPickerItemContext): ProductPickerItem {
  const quantity = context.productQuantities[product.id] ?? 0;
  const isCombo = product.type === 'combo';
  const isPlatter = product.type === 'platter';
  const isCustomizable = product.modifierGroupIds.length > 0;
  const disabled = !product.available;
  const recentlyAdded = context.lastAddedProductId === product.id;
  const isFavorite = context.favoriteProductIds.includes(product.id);
  const isBestSeller = context.bestSellerProductIds.includes(product.id);
  const nameParams = { name: product.name };
  const countParams = { name: product.name, count: quantity };
  const configuredLines = productConfiguredLines(product, context);
  const configuredLineCount = configuredLines.length;

  return {
    id: product.id,
    name: product.name,
    visualIcon: productVisualIcon(product),
    visualClass: productVisualClass(product),
    priceLabel: context.formatCurrency(product.basePrice ?? product.price ?? 0),
    categoryLabel: product.category ?? product.categoryId,
    allergenLabel: product.allergens?.length ? product.allergens.join(', ') : context.translate('restaurantPos.service.noAllergens'),
    description: product.description ?? '',
    badges: productPickerBadges(product, { isCombo, isCustomizable, isFavorite, isBestSeller, recentlyAdded }, context.translate),
    actionLabel: productActionLabel({ isCombo, isPlatter, isCustomizable }, context.translate),
    actionAriaLabel: productActionAriaLabel(product, { isCombo, isPlatter, isCustomizable }, context.translate),
    disabled,
    quantity,
    showQuantityControls: !isCombo && !configuredLineCount && quantity > 0,
    configuredLines,
    configuredLineCount,
    hasSingleConfiguredLine: configuredLineCount === 1,
    hasMultipleConfiguredLines: configuredLineCount > 1,
    orderedSummaryLabel: context.translate('restaurantPos.service.productOptionsSummary', { count: quantity, options: configuredLineCount }),
    newOptionLabel: context.translate('restaurantPos.service.newProductOptionAction'),
    newOptionAriaLabel: context.translate('restaurantPos.service.newProductOptionActionLabel', nameParams),
    viewOptionsLabel: context.translate('restaurantPos.service.viewProductOptionsAction'),
    hideOptionsLabel: context.translate('restaurantPos.service.hideProductOptionsAction'),
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

function productConfiguredLines(product: Product, context: ProductPickerItemContext): ProductPickerConfiguredLine[] {
  return context.configuredLines
    .filter((line) => line.productId === product.id)
    .map((line) => ({
      ...line,
      quantityLabel: context.translate('restaurantPos.service.productLineQuantityLabel', {
        name: product.name,
        summary: line.summary,
        count: line.quantity,
      }),
      increaseAriaLabel: context.translate('restaurantPos.service.increaseProductLineQuantityActionLabel', {
        name: product.name,
        summary: line.summary,
      }),
      decreaseAriaLabel: context.translate('restaurantPos.service.decreaseProductLineQuantityActionLabel', {
        name: product.name,
        summary: line.summary,
      }),
    }));
}

function productVisualIcon(product: Product): string {
  if (product.type === 'combo') {
    return 'restaurant_menu';
  }

  if (product.type === 'platter') {
    return 'room_service';
  }

  switch (product.course) {
    case 'drinks':
      return 'local_drink';
    case 'dessert':
      return 'bakery_dining';
    case 'starter':
      return 'tapas';
    case 'main':
      return 'lunch_dining';
    default:
      return 'restaurant';
  }
}

function productVisualClass(product: Product): string {
  const baseClass = 'grid h-11 w-11 shrink-0 place-items-center rounded-full border';

  if (product.type === 'combo') {
    return `${baseClass} border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200`;
  }

  if (product.type === 'platter') {
    return `${baseClass} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200`;
  }

  switch (product.course) {
    case 'drinks':
      return `${baseClass} border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200`;
    case 'dessert':
      return `${baseClass} border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200`;
    case 'starter':
      return `${baseClass} border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200`;
    default:
      return `${baseClass} border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-200`;
  }
}

function productPickerBadges(
  product: Product,
  state: { isCombo: boolean; isCustomizable: boolean; isFavorite: boolean; isBestSeller: boolean; recentlyAdded: boolean },
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

  if (state.isFavorite) {
    badges.push(productPickerBadge('favorite', translate('restaurantPos.service.favoriteBadge')));
  }

  if (state.isBestSeller) {
    badges.push(productPickerBadge('bestSeller', translate('restaurantPos.service.bestSellerBadge')));
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
  state: { isCombo: boolean; isPlatter: boolean; isCustomizable: boolean },
  translate: ProductPickerItemContext['translate'],
): string {
  if (state.isCombo) {
    return translate('restaurantPos.service.configureComboAction');
  }

  if (state.isPlatter && state.isCustomizable) {
    return translate('restaurantPos.service.configurePlatterAction');
  }

  if (state.isCustomizable) {
    return translate('restaurantPos.service.configureProductAction');
  }

  return translate('restaurantPos.service.addProductAction');
}

function productActionAriaLabel(
  product: Product,
  state: { isCombo: boolean; isPlatter: boolean; isCustomizable: boolean },
  translate: ProductPickerItemContext['translate'],
): string {
  if (state.isCombo) {
    return translate('restaurantPos.service.configureComboActionLabel', { name: product.name });
  }

  if (state.isPlatter && state.isCustomizable) {
    return translate('restaurantPos.service.configurePlatterActionLabel', { name: product.name });
  }

  if (state.isCustomizable) {
    return translate('restaurantPos.service.configureProductActionLabel', { name: product.name });
  }

  return translate('restaurantPos.service.increaseProductQuantityActionLabel', { name: product.name });
}
