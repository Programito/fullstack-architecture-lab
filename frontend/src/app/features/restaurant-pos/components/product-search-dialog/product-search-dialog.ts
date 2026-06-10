import { Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { SegmentedControl, type SegmentedControlOption } from '../../../../shared/ui/segmented-control/segmented-control';
import type { Product } from '../../models/restaurant-pos.models';

export type ProductSearchView = 'all' | 'favorites';

@Component({
  selector: 'app-product-search-dialog',
  imports: [Dialog, SearchInput, Select, SegmentedControl, TranslocoPipe],
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

  readonly closed = output<void>();
  readonly queryChanged = output<string>();
  readonly searched = output<string>();
  readonly productViewChanged = output<ProductSearchView>();
  readonly productCategoryFilterChanged = output<string>();
  readonly favoriteToggled = output<string>();
  readonly productSelected = output<string>();

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

  protected isFavorite(productId: string): boolean {
    return this.favoriteProductIds().includes(productId);
  }

  protected wasRecentlyAdded(productId: string): boolean {
    return this.lastAddedProductId() === productId;
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
