import { Component, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import type { Product } from '../../models/restaurant-pos.models';

@Component({
  selector: 'app-product-search-dialog',
  imports: [Dialog, SearchInput, TranslocoPipe],
  templateUrl: './product-search-dialog.html',
})
export class ProductSearchDialog {
  readonly open = input(false);
  readonly query = input('');
  readonly products = input<readonly Product[]>([]);

  readonly closed = output<void>();
  readonly queryChanged = output<string>();
  readonly searched = output<string>();
  readonly productSelected = output<string>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected productAllergenLabel(product: Product): string {
    return product.allergens?.length ? product.allergens.join(', ') : this.translate('restaurantPos.service.noAllergens');
  }

  private translate(key: string): string {
    this.activeLang();
    return this.transloco.translate(key);
  }
}
