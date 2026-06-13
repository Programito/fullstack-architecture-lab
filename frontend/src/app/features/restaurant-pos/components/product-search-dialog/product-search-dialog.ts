import { Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { SegmentedControl, type SegmentedControlOption } from '../../../../shared/ui/segmented-control/segmented-control';
import type { Product } from '../../models/restaurant-pos.models';

export type ProductSearchView = 'all' | 'favorites';

@Component({
  selector: 'app-product-search-dialog',
  imports: [Dialog, Icon, SearchInput, Select, SegmentedControl, TranslocoPipe],
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
  protected readonly productViewOptions = computed<SegmentedControlOption[]>(() => [
    { label: this.translate('restaurantPos.service.allProducts'), value: 'all' },
    { label: this.translate('restaurantPos.service.favoriteProducts'), value: 'favorites' },
  ]);

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
      'theme-field grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-md border p-2 text-sm transition sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center',
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
    return this.transloco.translate(key, params);
  }
}
