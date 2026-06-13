import { Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { SegmentedControl, type SegmentedControlOption } from '../../../../shared/ui/segmented-control/segmented-control';
import type { Product } from '../../models/restaurant-pos.models';

export type ProductSearchView = 'all' | 'favorites';

@Component({
  selector: 'app-product-search-dialog',
  imports: [Dialog, Icon, SearchInput, Select, SegmentedControl],
  templateUrl: './product-search-dialog.html',
})
export class ProductSearchDialog {
  readonly open = input(false);
  readonly query = input('');
  readonly products = input<readonly Product[]>([]);
  readonly productView = input<ProductSearchView>('all');
  readonly productCategoryFilter = input('all');
  readonly productCategoryOptions = input<SelectOption[]>([]);
  readonly favoriteProductIds = input<readonly string[]>([]);
  readonly lastAddedProductId = input<string | null>(null);
  readonly productQuantities = input<Record<string, number>>({});

  readonly closed = output<void>();
  readonly finished = output<void>();
  readonly queryChanged = output<string>();
  readonly searched = output<string>();
  readonly productViewChanged = output<ProductSearchView>();
  readonly productCategoryFilterChanged = output<string>();
  readonly favoriteToggled = output<string>();
  readonly productIncremented = output<string>();
  readonly productDecremented = output<string>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  private readonly fallbackTranslations: Record<string, string> = {
    'restaurantPos.service.addProductsTitle': 'Añadir productos',
    'restaurantPos.service.addProductsDescription': 'Busca, filtra y añade productos al pedido.',
    'restaurantPos.service.searchProduct': 'Buscar producto',
    'restaurantPos.service.searchProductPlaceholder': 'Buscar plato, bebida o alérgeno',
    'restaurantPos.service.productView': 'Vista de productos',
    'restaurantPos.service.allProducts': 'Todos',
    'restaurantPos.service.favoriteProducts': 'Favoritos',
    'restaurantPos.service.productCategoryFilter': 'Categoría',
    'restaurantPos.service.productAdded': 'Añadido',
    'restaurantPos.service.customizable': 'Personalizable',
    'restaurantPos.service.combo': 'Menú',
    'restaurantPos.service.soldOut': 'Agotado',
    'restaurantPos.service.finishProductSearch': 'Cerrar',
    'restaurantPos.service.addProductAction': 'Añadir',
    'restaurantPos.service.configureProductAction': 'Configurar',
    'restaurantPos.service.comboComingSoonAction': 'Próximamente',
    'restaurantPos.service.configureProductActionLabel': 'Configurar {{name}}',
    'restaurantPos.service.comboComingSoonActionLabel': 'Configuración de menú próximamente para {{name}}',
    'restaurantPos.service.productQuantityLabel': 'Cantidad de {{name}}: {{count}}',
    'restaurantPos.service.addFavoriteProduct': 'Añadir {{name}} a favoritos',
    'restaurantPos.service.removeFavoriteProduct': 'Quitar {{name}} de favoritos',
    'restaurantPos.service.closeProductSearch': 'Cerrar buscador de productos',
    'restaurantPos.service.clearProductSearch': 'Limpiar búsqueda de productos',
    'restaurantPos.service.noProductResults': 'No hay productos que coincidan con la búsqueda.',
    'restaurantPos.service.noAllergens': 'Sin alérgenos indicados',
    'restaurantPos.service.increaseProductQuantityActionLabel': 'Añadir una unidad de {{name}}',
    'restaurantPos.service.decreaseProductQuantityActionLabel': 'Quitar una unidad de {{name}}',
  };
  protected readonly productViewOptions = computed<SegmentedControlOption[]>(() => [
    { label: this.translate('restaurantPos.service.allProducts'), value: 'all' },
    { label: this.translate('restaurantPos.service.favoriteProducts'), value: 'favorites' },
  ]);

  protected text(key: string, params?: Record<string, unknown>): string {
    return this.translate(key, params);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected productAllergenLabel(product: Product): string {
    return product.allergens?.length ? product.allergens.join(', ') : this.translate('restaurantPos.service.noAllergens');
  }

  protected productPrice(product: Product): number {
    return product.basePrice ?? product.price ?? 0;
  }

  protected productCategoryLabel(product: Product): string {
    return product.category ?? product.categoryId;
  }

  protected isCustomizable(product: Product): boolean {
    return product.modifierGroupIds.length > 0;
  }

  protected isCombo(product: Product): boolean {
    return product.type === 'combo';
  }

  protected productActionLabel(product: Product): string {
    if (this.isCombo(product)) {
      return this.translate('restaurantPos.service.comboComingSoonAction');
    }

    if (this.isCustomizable(product)) {
      return this.translate('restaurantPos.service.configureProductAction');
    }

    return this.translate('restaurantPos.service.addProductAction');
  }

  protected productActionAriaLabel(product: Product): string {
    if (this.isCombo(product)) {
      return this.translate('restaurantPos.service.comboComingSoonActionLabel', { name: product.name });
    }

    if (this.isCustomizable(product)) {
      return this.translate('restaurantPos.service.configureProductActionLabel', { name: product.name });
    }

    return this.translate('restaurantPos.service.increaseProductQuantityActionLabel', { name: product.name });
  }

  protected shouldShowQuantityControls(product: Product): boolean {
    return this.productQuantity(product.id) > 0;
  }

  protected canUsePrimaryAction(product: Product): boolean {
    return product.available && !this.isCombo(product);
  }

  protected canIncrementProduct(product: Product): boolean {
    return product.available && !this.isCombo(product);
  }

  protected isFavorite(productId: string): boolean {
    return this.favoriteProductIds().includes(productId);
  }

  protected wasRecentlyAdded(productId: string): boolean {
    return this.lastAddedProductId() === productId;
  }

  protected productQuantity(productId: string): number {
    return this.productQuantities()[productId] ?? 0;
  }

  protected productRowClass(productId: string): string {
    const selectedClass =
      this.productQuantity(productId) > 0 || this.wasRecentlyAdded(productId)
        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'
        : '';

    return [
      'theme-field grid min-h-32 grid-cols-1 items-start gap-3 rounded-lg border p-4 text-sm transition hover:border-cyan-500/60',
      selectedClass,
      this.products().find((product) => product.id === productId)?.available === false ? 'opacity-60' : '',
    ].join(' ');
  }

  protected favoriteAriaLabel(product: Product): string {
    return this.translate(this.isFavorite(product.id) ? 'restaurantPos.service.removeFavoriteProduct' : 'restaurantPos.service.addFavoriteProduct', {
      name: product.name,
    });
  }

  protected changeProductView(value: string): void {
    if (value === 'all' || value === 'favorites') {
      this.productViewChanged.emit(value);
    }
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
