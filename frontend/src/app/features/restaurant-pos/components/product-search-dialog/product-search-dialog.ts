import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import type { Product } from '../../models/restaurant-pos.models';
import { toProductPickerItem, type ProductPickerConfiguredLineInput, type ProductPickerItem } from './product-picker-item.mapper';

export type ProductPickerSection = 'all' | 'favorites' | 'best_sellers' | 'drinks' | 'food' | 'combos' | 'platters' | 'desserts';

type ProductSectionOption = {
  id: ProductPickerSection;
  label: string;
  count: number;
};

type ProductPickerGroup = {
  id: ProductPickerSection | 'search_results';
  label: string;
  items: ProductPickerItem[];
};

@Component({
  selector: 'app-product-search-dialog',
  imports: [Dialog, Icon, SearchInput],
  templateUrl: './product-search-dialog.html',
})
export class ProductSearchDialog {
  readonly open = input(false);
  readonly query = input('');
  readonly products = input<readonly Product[]>([]);
  readonly allProducts = input<readonly Product[]>([]);
  readonly activeSection = input<ProductPickerSection>('all');
  readonly favoriteProductIds = input<readonly string[]>([]);
  readonly bestSellerProductIds = input<readonly string[]>([]);
  readonly lastAddedProductId = input<string | null>(null);
  readonly productQuantities = input<Record<string, number>>({});
  readonly configuredLines = input<readonly ProductPickerConfiguredLineInput[]>([]);
  readonly selectedOrderTotal = input<number | null>(null);

  readonly closed = output<void>();
  readonly finished = output<void>();
  readonly queryChanged = output<string>();
  readonly searched = output<string>();
  readonly sectionChanged = output<ProductPickerSection>();
  readonly favoriteToggled = output<string>();
  readonly productConfigured = output<string>();
  readonly productIncremented = output<string>();
  readonly productDecremented = output<string>();
  readonly configuredLineIncremented = output<string>();
  readonly configuredLineDecremented = output<string>();

  private readonly transloco = inject(TranslocoService);
  private readonly expandedProductIds = signal<readonly string[]>([]);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  private readonly fallbackTranslations: Record<string, string> = {
    'restaurantPos.service.addProductsTitle': 'Anadir productos',
    'restaurantPos.service.addProductsDescription': 'Busca, filtra y anade productos al pedido.',
    'restaurantPos.service.searchProduct': 'Buscar producto',
    'restaurantPos.service.searchProductPlaceholder': 'Buscar plato, bebida o alergeno',
    'restaurantPos.service.productView': 'Vista de productos',
    'restaurantPos.service.allProducts': 'Todos',
    'restaurantPos.service.favoriteProducts': 'Favoritos',
    'restaurantPos.service.bestSellerProducts': 'Mas vendidos',
    'restaurantPos.service.drinkProducts': 'Bebidas',
    'restaurantPos.service.foodProducts': 'Comida',
    'restaurantPos.service.comboProducts': 'Menus',
    'restaurantPos.service.platterProducts': 'Platos combinados',
    'restaurantPos.service.dessertProducts': 'Postres',
    'restaurantPos.service.productSearchResults': 'Resultados',
    'restaurantPos.service.productSearchResultsFor': 'Resultados para "{{query}}"',
    'restaurantPos.service.productAdded': 'Anadido',
    'restaurantPos.service.customizable': 'Personalizable',
    'restaurantPos.service.combo': 'Menu',
    'restaurantPos.service.platter': 'Plato combinado',
    'restaurantPos.service.soldOut': 'Agotado',
    'restaurantPos.service.favoriteBadge': 'Favorito',
    'restaurantPos.service.bestSellerBadge': 'Mas vendido',
    'restaurantPos.service.finishProductSearch': 'Cerrar',
    'restaurantPos.service.productPickerSummary': '{{count}} productos anadidos · {{total}}',
    'restaurantPos.service.addProductAction': 'Anadir',
    'restaurantPos.service.configureProductAction': 'Configurar',
    'restaurantPos.service.configureComboAction': 'Configurar menu',
    'restaurantPos.service.configureProductActionLabel': 'Configurar {{name}}',
    'restaurantPos.service.configureComboActionLabel': 'Configurar menu {{name}}',
    'restaurantPos.service.addComboToOrder': 'Anadir menu',
    'restaurantPos.service.comboBasePrice': 'Precio base',
    'restaurantPos.service.comboTotal': 'Total menu',
    'restaurantPos.service.productQuantityLabel': 'Cantidad de {{name}}: {{count}}',
    'restaurantPos.service.addFavoriteProduct': 'Anadir {{name}} a favoritos',
    'restaurantPos.service.removeFavoriteProduct': 'Quitar {{name}} de favoritos',
    'restaurantPos.service.closeProductSearch': 'Cerrar buscador de productos',
    'restaurantPos.service.clearProductSearch': 'Limpiar busqueda de productos',
    'restaurantPos.service.noProductResults': 'No hay productos que coincidan con la busqueda.',
    'restaurantPos.service.noAllergens': 'Sin alergenos indicados',
    'restaurantPos.service.increaseProductQuantityActionLabel': 'Anadir una unidad de {{name}}',
    'restaurantPos.service.decreaseProductQuantityActionLabel': 'Quitar una unidad de {{name}}',
    'restaurantPos.service.newProductOptionAction': 'Nueva opcion',
    'restaurantPos.service.newProductOptionActionLabel': 'Crear otra opcion de {{name}}',
    'restaurantPos.service.viewProductOptionsAction': 'Ver opciones',
    'restaurantPos.service.hideProductOptionsAction': 'Ocultar',
    'restaurantPos.service.productOptionsSummary': '{{count}} en pedido · {{options}} opciones',
    'restaurantPos.service.defaultProductOption': 'Opcion estandar',
    'restaurantPos.service.noteSummary': 'Nota: {{note}}',
    'restaurantPos.service.productLineQuantityLabel': 'Cantidad de {{name}} ({{summary}}): {{count}}',
    'restaurantPos.service.increaseProductLineQuantityActionLabel': 'Anadir una unidad de {{name}} con {{summary}}',
    'restaurantPos.service.decreaseProductLineQuantityActionLabel': 'Quitar una unidad de {{name}} con {{summary}}',
  };
  protected readonly sectionOptions = computed<ProductSectionOption[]>(() => [
    { id: 'all', label: this.translate('restaurantPos.service.allProducts'), count: this.sectionProductCount('all') },
    { id: 'favorites', label: this.translate('restaurantPos.service.favoriteProducts'), count: this.sectionProductCount('favorites') },
    { id: 'best_sellers', label: this.translate('restaurantPos.service.bestSellerProducts'), count: this.sectionProductCount('best_sellers') },
    { id: 'drinks', label: this.translate('restaurantPos.service.drinkProducts'), count: this.sectionProductCount('drinks') },
    { id: 'food', label: this.translate('restaurantPos.service.foodProducts'), count: this.sectionProductCount('food') },
    { id: 'combos', label: this.translate('restaurantPos.service.comboProducts'), count: this.sectionProductCount('combos') },
    { id: 'platters', label: this.translate('restaurantPos.service.platterProducts'), count: this.sectionProductCount('platters') },
    { id: 'desserts', label: this.translate('restaurantPos.service.dessertProducts'), count: this.sectionProductCount('desserts') },
  ]);
  protected readonly productPickerSummary = computed(() => {
    const selectedOrderTotal = this.selectedOrderTotal();
    const summaryProducts = this.allProducts().length ? this.allProducts() : this.products();
    const productById = new Map(summaryProducts.map((product) => [product.id, product]));
    let count = 0;
    let total = 0;

    for (const [productId, quantity] of Object.entries(this.productQuantities())) {
      if (quantity <= 0) {
        continue;
      }

      count += quantity;
      const product = productById.get(productId);
      total += (product ? this.productPrice(product) : 0) * quantity;
    }

    if (count === 0) {
      return '';
    }

    if (selectedOrderTotal !== null) {
      total = selectedOrderTotal;
    }

    return this.translate('restaurantPos.service.productPickerSummary', {
      count,
      total: this.formatCurrency(total),
    });
  });
  protected readonly productPickerItems = computed(() =>
    this.products().map((product) =>
      toProductPickerItem(product, {
        favoriteProductIds: this.favoriteProductIds(),
        bestSellerProductIds: this.bestSellerProductIds(),
        lastAddedProductId: this.lastAddedProductId(),
        productQuantities: this.productQuantities(),
        configuredLines: this.configuredLines(),
        formatCurrency: (value) => this.formatCurrency(value),
        translate: (key, params) => this.translate(key, params),
      }),
    ),
  );
  protected readonly productPickerGroups = computed<ProductPickerGroup[]>(() => {
    const items = this.productPickerItems();
    const query = this.normalizeSearch(this.query());

    if (query) {
      return [
        {
          id: 'search_results',
          label: this.translate('restaurantPos.service.productSearchResultsFor', { query: this.query().trim() }),
          items: this.filterItemsByQuery(items, query),
        },
      ];
    }

    const activeSection = this.activeSection();

    if (activeSection !== 'all') {
      return [{ id: activeSection, label: this.sectionLabel(activeSection), items }];
    }

    const usedProductIds = new Set<string>();
    const group = (id: ProductPickerSection, groupItems: ProductPickerItem[]): ProductPickerGroup => {
      const uniqueItems = groupItems.filter((item) => {
        if (usedProductIds.has(item.id)) {
          return false;
        }

        usedProductIds.add(item.id);
        return true;
      });

      return { id, label: this.sectionLabel(id), items: uniqueItems };
    };

    return [
      group('favorites', items.filter((item) => item.isFavorite)),
      group('best_sellers', items.filter((item) => this.bestSellerProductIds().includes(item.id))),
      group('drinks', this.itemsForSection(items, 'drinks')),
      group('food', this.itemsForSection(items, 'food')),
      group('combos', this.itemsForSection(items, 'combos')),
      group('platters', this.itemsForSection(items, 'platters')),
      group('desserts', this.itemsForSection(items, 'desserts')),
    ].filter((currentGroup) => currentGroup.items.length > 0);
  });

  protected text(key: string, params?: Record<string, unknown>): string {
    return this.translate(key, params);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected productPrice(product: Product): number {
    return product.basePrice ?? product.price ?? 0;
  }

  protected changeSection(section: ProductPickerSection): void {
    this.sectionChanged.emit(section);
  }

  protected isActiveSection(section: ProductPickerSection): boolean {
    return this.activeSection() === section;
  }

  protected sectionChipClass(section: ProductPickerSection): string {
    const baseClass =
      'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition hover:border-[var(--ui-primary)] hover:bg-[var(--ui-primary-ring)] hover:text-[var(--ui-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-primary)]';

    return this.isActiveSection(section)
      ? `${baseClass} border-[var(--ui-primary)] bg-[var(--ui-primary-ring)] text-[var(--ui-primary)]`
      : `${baseClass} theme-field`;
  }

  protected isProductExpanded(productId: string): boolean {
    return this.expandedProductIds().includes(productId);
  }

  protected toggleProductOptions(productId: string): void {
    this.expandedProductIds.update((expandedProductIds) =>
      expandedProductIds.includes(productId)
        ? expandedProductIds.filter((currentProductId) => currentProductId !== productId)
        : [...expandedProductIds, productId],
    );
  }

  private sectionLabel(section: ProductPickerSection): string {
    return this.sectionOptions().find((option) => option.id === section)?.label ?? section;
  }

  private sectionProductCount(section: ProductPickerSection): number {
    const countProducts = this.allProducts().length ? this.allProducts() : this.products();

    if (section === 'all') {
      return countProducts.length;
    }

    return countProducts.filter((product) => this.productMatchesSection(product, section)).length;
  }

  private itemsForSection(items: ProductPickerItem[], section: ProductPickerSection): ProductPickerItem[] {
    const productsById = new Map(this.products().map((product) => [product.id, product]));

    return items.filter((item) => {
      const product = productsById.get(item.id);
      return product ? this.productMatchesSection(product, section) : false;
    });
  }

  private productMatchesSection(product: Product, section: ProductPickerSection): boolean {
    switch (section) {
      case 'favorites':
        return this.favoriteProductIds().includes(product.id);
      case 'best_sellers':
        return this.bestSellerProductIds().includes(product.id);
      case 'drinks':
        return product.course === 'drinks';
      case 'food':
        return (product.course === 'starter' || product.course === 'main') && product.type !== 'combo' && product.type !== 'platter';
      case 'combos':
        return product.type === 'combo';
      case 'platters':
        return product.type === 'platter';
      case 'desserts':
        return product.course === 'dessert';
      default:
        return true;
    }
  }

  private filterItemsByQuery(items: ProductPickerItem[], query: string): ProductPickerItem[] {
    const productsById = new Map(this.products().map((product) => [product.id, product]));

    return items.filter((item) => {
      const product = productsById.get(item.id);
      return product ? this.productSearchText(product).includes(query) : this.normalizeSearch(item.name).includes(query);
    });
  }

  private productSearchText(product: Product): string {
    return this.normalizeSearch(
      [
        product.name,
        product.category,
        product.categoryId,
        product.course,
        product.type,
        product.type === 'combo' ? this.translate('restaurantPos.service.combo') : null,
        product.type === 'platter' ? this.translate('restaurantPos.service.platter') : null,
        product.modifierGroupIds.length ? this.translate('restaurantPos.service.customizable') : null,
        product.course === 'drinks' ? this.translate('restaurantPos.service.drinkProducts') : null,
        product.course === 'dessert' ? this.translate('restaurantPos.service.dessertProducts') : null,
        ...(product.allergens ?? []),
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  private normalizeSearch(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    const translated = this.transloco.translate(key, params);

    if (translated && translated !== key) {
      return translated;
    }

    return this.interpolate(this.fallbackTranslations[key] ?? key, params);
  }

  private interpolate(value: string, params?: Record<string, unknown>): string {
    if (!params) {
      return value;
    }

    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, param: string) => String(params[param] ?? ''));
  }
}
