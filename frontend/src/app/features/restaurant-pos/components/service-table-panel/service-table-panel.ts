import { NgClass } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { OrderCourse, OrderLineStatus, PaymentMethod, Product, RestaurantTable, TableOrder, TableStatus } from '../../models/restaurant-pos.models';

@Component({
  selector: 'app-service-table-panel',
  imports: [Button, Dialog, Icon, NgClass, TranslocoPipe],
  templateUrl: './service-table-panel.html',
})
export class ServiceTablePanel {
  readonly table = input<RestaurantTable | null>(null);
  readonly order = input<TableOrder | null>(null);
  readonly title = input.required<string>();
  readonly quickProducts = input<readonly Product[]>([]);
  readonly errorMessage = input<string | null>(null);
  readonly canSendToKitchen = input(false);
  readonly canMarkServed = input(false);
  readonly canCharge = input(false);
  readonly canMarkCleaning = input(false);
  readonly canFreeTable = input(false);

  readonly occupy = output<void>();
  readonly openProductSearch = output<void>();
  readonly addProduct = output<string>();
  readonly sendToKitchen = output<void>();
  readonly markServed = output<void>();
  readonly setPaymentMethod = output<PaymentMethod>();
  readonly charge = output<void>();
  readonly markCleaning = output<void>();
  readonly freeTable = output<void>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly freeTableConfirmOpen = signal(false);
  protected readonly chargePriority = computed(() => {
    const status = this.table()?.status;
    return this.canCharge() && (status === 'served' || status === 'payment_pending');
  });

  protected tableStatusLabel(status: TableStatus): string {
    return this.translate(`restaurantPos.tableStatus.${status}`);
  }

  protected lineStatusLabel(status: OrderLineStatus): string {
    return this.translate(`restaurantPos.lineStatus.${status}`);
  }

  protected courseLabel(course: OrderCourse): string {
    return this.translate(`restaurantPos.course.${course}`);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected formatClock(value: string | undefined): string {
    if (!value) {
      return this.translate('restaurantPos.service.notStarted');
    }

    return new Intl.DateTimeFormat(this.activeLang(), { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  protected formatDuration(value: string | undefined, fallback: string): string {
    if (!value) {
      return fallback;
    }

    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
  }

  protected paymentMethodClass(paymentMethod: PaymentMethod): string {
    return this.order()?.paymentMethod === paymentMethod ? 'border-cyan-600 bg-cyan-50 text-cyan-950' : 'theme-field';
  }

  protected serviceAttentionClass(table: RestaurantTable): string {
    if (table.status === 'waiting_kitchen') {
      return 'border-amber-200 bg-amber-50 text-amber-900';
    }

    if (table.status === 'payment_pending') {
      return 'border-orange-200 bg-orange-50 text-orange-900';
    }

    if (table.status === 'paid') {
      return 'border-cyan-200 bg-cyan-50 text-cyan-900';
    }

    if (table.status === 'cleaning') {
      return 'border-sky-200 bg-sky-50 text-sky-900';
    }

    return 'theme-chip';
  }

  protected actionLabel(key: string): string {
    return this.translate(`restaurantPos.service.${key}`);
  }

  protected requestFreeTable(): void {
    if (this.canFreeTable()) {
      this.freeTableConfirmOpen.set(true);
    }
  }

  protected closeFreeTableConfirm(): void {
    this.freeTableConfirmOpen.set(false);
  }

  protected confirmFreeTable(): void {
    this.freeTable.emit();
    this.closeFreeTableConfirm();
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }
}
