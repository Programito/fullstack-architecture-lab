import { Component, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import type { FloorElement, RestaurantTable, TableStatus } from '../../models/restaurant-pos.models';

export interface ServicePointSearchResult {
  element: FloorElement;
  table: RestaurantTable | null;
}

@Component({
  selector: 'app-service-point-search-dialog',
  imports: [Dialog, SearchInput, TranslocoPipe],
  templateUrl: './service-point-search-dialog.html',
})
export class ServicePointSearchDialog {
  readonly open = input(false);
  readonly query = input('');
  readonly servicePoints = input<readonly ServicePointSearchResult[]>([]);

  readonly closed = output<void>();
  readonly queryChanged = output<string>();
  readonly searched = output<string>();
  readonly servicePointSelected = output<FloorElement>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  protected tableStatusLabel(status: TableStatus): string {
    return this.translate(`restaurantPos.tableStatus.${status}`);
  }

  protected servicePointTypeLabel(element: FloorElement): string {
    return element.type === 'stool' ? this.translate('restaurantPos.floorPlan.stool') : this.translate('restaurantPos.floorPlan.table');
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }
}
