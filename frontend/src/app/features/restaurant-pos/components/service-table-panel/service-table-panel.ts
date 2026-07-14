import { NgClass } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { OrderCourse, OrderCourseGroup, OrderLine, OrderLineStatus, PaymentMethod, RestaurantTable, ServiceTableInfo, TableStatus } from '../../models/restaurant-pos.models';

export interface OrderLineNoteChange {
  lineId: string;
  note: string;
}

@Component({
  selector: 'app-service-table-panel',
  imports: [Button, Dialog, Icon, NgClass, TranslocoPipe],
  templateUrl: './service-table-panel.html',
})
export class ServiceTablePanel {
  readonly serviceInfo = input<ServiceTableInfo | null>(null);
  readonly title = input.required<string>();
  readonly errorMessage = input<string | null>(null);

  readonly occupy = output<void>();
  readonly openProductSearch = output<void>();
  readonly sendToKitchen = output<void>();
  readonly markServed = output<void>();
  readonly increaseProduct = output<string>();
  readonly decreaseProduct = output<string>();
  readonly markProductReady = output<string>();
  readonly markProductServed = output<string>();
  readonly removeProduct = output<string>();
  readonly updateProductNote = output<OrderLineNoteChange>();
  readonly setPaymentMethod = output<PaymentMethod>();
  readonly charge = output<void>();
  readonly markCleaning = output<void>();
  readonly freeTable = output<void>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly freeTableConfirmOpen = signal(false);
  protected readonly table = computed(() => this.serviceInfo()?.table ?? null);
  protected readonly order = computed(() => this.serviceInfo()?.order ?? null);
  protected readonly selectedServiceWorkflowSections = computed(() => {
    const info = this.serviceInfo();
    const order = info?.order;
    const pendingKitchenCount = info?.pendingKitchenCount ?? 0;
    const nextAction = info?.nextAction?.type;

    return [
      { id: 'summary', titleKey: 'restaurantPos.service.workflow.summary', highlighted: false, countLabel: null },
      { id: 'order', titleKey: 'restaurantPos.service.workflow.order', highlighted: false, countLabel: order ? `${order.lines.length}` : null },
      {
        id: 'kitchen',
        titleKey: 'restaurantPos.service.workflow.kitchen',
        highlighted: nextAction === 'send_kitchen' || nextAction === 'mark_served',
        countLabel: pendingKitchenCount > 0 ? `${pendingKitchenCount}` : null,
      },
      {
        id: 'payment',
        titleKey: 'restaurantPos.service.workflow.payment',
        highlighted: nextAction === 'charge',
        countLabel: order ? this.formatCurrency(order.total) : null,
      },
      {
        id: 'closing',
        titleKey: 'restaurantPos.service.workflow.closing',
        highlighted: nextAction === 'cleaning' || nextAction === 'free_table',
        countLabel: null,
      },
    ] as const;
  });
  protected readonly chargePriority = computed(() => {
    const status = this.table()?.status;
    return this.serviceInfo()?.canCharge && (status === 'served' || status === 'payment_pending');
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

  protected servicePhaseLabel(): string {
    const phase = this.serviceInfo()?.servicePhase;

    if (!phase || phase.status === 'no_order') {
      return this.translate('restaurantPos.service.noOrderPhase');
    }

    if (phase.status === 'pending' && phase.course) {
      return this.translate('restaurantPos.service.coursePending', { course: this.courseLabel(phase.course) });
    }

    return this.translate('restaurantPos.service.readyToChargePhase');
  }

  protected serviceSummaryLabel(table: RestaurantTable): string {
    return this.translate('restaurantPos.service.serviceSummary', {
      status: this.tableStatusLabel(table.status),
      duration: this.serviceDuration(table),
      phase: this.servicePhaseLabel(),
      total: this.formatCurrency(table.total),
    });
  }

  protected pendingKitchenCountLabel(): string {
    return this.translate('restaurantPos.service.pendingKitchenCount', { count: this.serviceInfo()?.pendingKitchenCount ?? 0 });
  }

  protected courseSummaryLabel(group: OrderCourseGroup): string {
    return this.translate('restaurantPos.service.courseSummary', {
      count: group.lines.reduce((sum, line) => sum + line.quantity, 0),
      total: this.formatCurrency(group.total),
    });
  }

  protected groupedOrderCourses(): OrderCourseGroup[] {
    return this.serviceInfo()?.courseGroups ?? [];
  }

  protected pendingKitchenCount(): number {
    return this.serviceInfo()?.pendingKitchenCount ?? 0;
  }

  protected nextActionLabel(): string {
    const action = this.serviceInfo()?.nextAction;

    switch (action?.type) {
      case 'send_kitchen':
        return this.translate('restaurantPos.service.nextActionSendKitchen', { count: action.count });
      case 'mark_served':
        return this.translate('restaurantPos.service.nextActionMarkServed');
      case 'charge':
        return this.translate('restaurantPos.service.nextActionCharge');
      case 'cleaning':
        return this.translate('restaurantPos.service.nextActionCleaning');
      case 'free_table':
        return this.translate('restaurantPos.service.nextActionFreeTable');
      default:
        return this.translate('restaurantPos.service.nextActionNone');
    }
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

  protected serviceDuration(table: RestaurantTable): string {
    return this.formatDuration(table.occupiedAt ?? table.serviceStartedAt ?? table.cleaningStartedAt, table.openDuration);
  }

  protected paymentMethodClass(paymentMethod: PaymentMethod): string {
    return this.order()?.paymentMethod === paymentMethod ? 'border-cyan-600 bg-cyan-50 text-cyan-950' : 'theme-field';
  }

  protected canSendToKitchen(): boolean {
    return this.serviceInfo()?.canSendToKitchen ?? false;
  }

  protected canMarkServed(): boolean {
    return this.serviceInfo()?.canMarkServed ?? false;
  }

  protected canCharge(): boolean {
    return this.serviceInfo()?.canCharge ?? false;
  }

  protected canMarkCleaning(): boolean {
    return this.serviceInfo()?.canMarkCleaning ?? false;
  }

  protected canFreeTable(): boolean {
    return this.serviceInfo()?.canFreeTable ?? false;
  }

  protected serviceAttentionClass(table: RestaurantTable): string {
    if (table.status === 'occupied') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
    }

    if (table.status === 'waiting_kitchen') {
      return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
    }

    if (table.status === 'served') {
      return 'border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200';
    }

    if (table.status === 'payment_pending') {
      return 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-200';
    }

    if (table.status === 'paid') {
      return 'border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200';
    }

    if (table.status === 'cleaning') {
      return 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200';
    }

    if (table.status === 'reserved') {
      return 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200';
    }

    return 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200';
  }

  protected tableStatusIcon(status: TableStatus): string {
    switch (status) {
      case 'free':
        return 'check_circle';
      case 'occupied':
        return 'event_seat';
      case 'waiting_kitchen':
        return 'skillet';
      case 'served':
        return 'room_service';
      case 'payment_pending':
        return 'payments';
      case 'paid':
        return 'task_alt';
      case 'cleaning':
        return 'cleaning_services';
      case 'reserved':
        return 'event_available';
      default:
        return 'radio_button_unchecked';
    }
  }

  protected actionLabel(key: string): string {
    return this.translate(`restaurantPos.service.${key}`);
  }

  protected lineActionLabel(key: string, productName: string): string {
    return this.translate(`restaurantPos.service.${key}`, { name: productName });
  }

  protected canMarkLineReady(line: OrderLine): boolean {
    return line.status === 'sent_to_kitchen' || line.status === 'preparing';
  }

  protected canMarkLineServed(line: OrderLine): boolean {
    return line.status === 'sent_to_kitchen' || line.status === 'preparing' || line.status === 'ready' || line.status === 'picked_up';
  }

  protected modifierLabel(line: OrderLine): string {
    return line.selectedModifiers
      .map((modifier) => (modifier.type === 'remove' ? this.translate('restaurantPos.service.withoutModifier', { name: modifier.name }) : modifier.name))
      .join(', ');
  }

  protected hasModifiers(line: OrderLine): boolean {
    return line.selectedModifiers.length > 0;
  }

  protected hasPlatterComponents(line: OrderLine): boolean {
    return (line.platterComponents?.length ?? 0) > 0;
  }

  protected platterComponentsLabel(line: OrderLine): string {
    return line.platterComponents?.map((component) => component.name.toLocaleLowerCase(this.activeLang())).join(', ') ?? '';
  }

  protected hasComboSlots(line: OrderLine): boolean {
    return (line.selectedComboSlots?.length ?? 0) > 0;
  }

  protected comboSlotLabel(slot: NonNullable<OrderLine['selectedComboSlots']>[number]): string {
    return slot.selectedProducts.map((product) => this.comboSlotProductLabel(product)).join(', ');
  }

  private comboSlotProductLabel(product: NonNullable<OrderLine['selectedComboSlots']>[number]['selectedProducts'][number]): string {
    return product.supplementPrice > 0 ? `${product.productName} +${this.formatCurrency(product.supplementPrice)}` : product.productName;
  }

  protected updateLineNote(lineId: string, event: Event): void {
    this.updateProductNote.emit({ lineId, note: (event.target as HTMLTextAreaElement).value });
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
