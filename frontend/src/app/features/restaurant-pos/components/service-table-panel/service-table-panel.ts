import { NgClass } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { OrderCourse, OrderCourseGroup, OrderLine, OrderLineStatus, PaymentMethod, RestaurantTable, ServiceTableInfo, TableOrder, TableStatus } from '../../models/restaurant-pos.models';
import { orderLineConfigurationIdentity } from '../../models/order-line-grouping';
import { ProductImage } from '../product-image/product-image';

export interface OrderLineNoteChange {
  lineId: string;
  note: string;
}

type GroupedOrderLine = {
  key: string;
  quantity: number;
  subtotal: number;
  lines: readonly OrderLine[];
  primaryLine: OrderLine;
};

type GroupedOrderCourse = Omit<OrderCourseGroup, 'lines' | 'quantity' | 'total'> & {
  lines: readonly GroupedOrderLine[];
  quantity: number;
  total: number;
};

@Component({
  selector: 'app-service-table-panel',
  imports: [Button, Dialog, Icon, NgClass, ProductImage, TranslocoPipe],
  templateUrl: './service-table-panel.html',
})
export class ServiceTablePanel {
  readonly serviceInfo = input<ServiceTableInfo | null>(null);
  readonly title = input.required<string>();
  readonly errorMessage = input<string | null>(null);
  readonly servedSelectionMode = input(false);
  readonly servedLineIds = input<readonly string[]>([]);
  readonly servableLines = input<readonly OrderLine[]>([]);
  readonly isCharging = input(false);
  readonly isSendingToKitchen = input(false);
  readonly isMarkingServed = input(false);

  readonly occupy = output<void>();
  readonly openProductSearch = output<void>();
  readonly sendToKitchen = output<void>();
  readonly markServed = output<void>();
  readonly servedLineToggled = output<string>();
  readonly allServedLinesSelected = output<void>();
  readonly servedSelectionConfirmed = output<void>();
  readonly cancelServedSelection = output<void>();
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  private readonly durationNow = signal(Date.now());
  protected readonly freeTableConfirmOpen = signal(false);
  protected readonly removeProductConfirmOpen = signal(false);
  protected readonly paymentHistoryExpanded = signal(false);
  protected readonly pendingRemovalGroup = signal<GroupedOrderLine | null>(null);
  protected readonly currentRemovalGroup = computed(() => this.resolveCurrentRemovalGroup());
  private readonly closeMissingRemovalTarget = effect(() => {
    if (this.removeProductConfirmOpen() && this.pendingRemovalGroup() && !this.currentRemovalGroup()) {
      this.closeRemoveProductConfirm();
    }
  });

  constructor() {
    const durationTimer = setInterval(() => this.durationNow.set(Date.now()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(durationTimer));
  }
  protected readonly table = computed(() => this.serviceInfo()?.table ?? null);
  protected readonly order = computed(() => this.serviceInfo()?.order ?? null);
  protected readonly guidesToOrder = computed(() => {
    const info = this.serviceInfo();
    return info?.table.status === 'occupied' && info.servicePhase.status === 'no_order';
  });
  protected readonly guidesToStartService = computed(() => {
    const status = this.table()?.status;
    return status === 'free' || status === 'reserved';
  });
  protected readonly selectedServiceWorkflowSections = computed(() => {
    const info = this.serviceInfo();
    const order = info?.order;
    const pendingKitchenCount = info?.pendingKitchenCount ?? 0;
    const nextAction = info?.nextAction?.type;

    return [
      { id: 'summary', titleKey: 'restaurantPos.service.workflow.summary', highlighted: this.guidesToStartService(), countLabel: null },
      { id: 'order', titleKey: 'restaurantPos.service.workflow.order', highlighted: this.guidesToOrder(), countLabel: order ? `${order.lines.length}` : null },
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
        highlighted: !this.guidesToOrder() && (nextAction === 'cleaning' || nextAction === 'free_table'),
        countLabel: null,
      },
    ] as const;
  });
  protected readonly chargePriority = computed(() => {
    const status = this.table()?.status;
    return this.serviceInfo()?.canCharge && (status === 'served' || status === 'payment_pending');
  });
  protected readonly orderTaxAmount = computed(() => this.order()?.tax ?? 0);
  protected readonly orderTaxableBase = computed(() => {
    const order = this.order();
    if (!order) return 0;
    return Math.max(0, order.total - (order.tax ?? 0));
  });
  protected readonly hasSelectedPaymentMethod = computed(() => {
    const paymentMethod = this.order()?.paymentMethod;
    return paymentMethod === 'cash' || paymentMethod === 'card';
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

  protected courseSummaryLabel(group: Pick<GroupedOrderCourse, 'quantity' | 'total'>): string {
    return this.translate('restaurantPos.service.courseSummary', {
      count: group.quantity,
      total: this.formatCurrency(group.total),
    });
  }

  protected groupedOrderCourses(): GroupedOrderCourse[] {
    return (this.serviceInfo()?.courseGroups ?? []).map((group) => {
      const groupedLines = new Map<string, GroupedOrderLine>();
      const orderedKeys: string[] = [];

      group.lines.forEach((line) => {
        const key = this.orderLineGroupKey(line);
        const existing = groupedLines.get(key);

        if (existing) {
          groupedLines.set(key, {
            ...existing,
            quantity: existing.quantity + line.quantity,
            subtotal: existing.subtotal + line.subtotal,
            lines: [...existing.lines, line],
          });
          return;
        }

        groupedLines.set(key, {
          key,
          quantity: line.quantity,
          subtotal: line.subtotal,
          lines: [line],
          primaryLine: line,
        });
        orderedKeys.push(key);
      });

      const lines = orderedKeys.map((key) => groupedLines.get(key)!);

      return {
        ...group,
        lines,
        quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
        total: lines.reduce((sum, line) => sum + line.subtotal, 0),
      };
    });
  }

  protected pendingKitchenCount(): number {
    return this.serviceInfo()?.pendingKitchenCount ?? 0;
  }

  protected nextActionLabel(): string {
    if (this.guidesToStartService()) {
      return this.translate('restaurantPos.service.nextActionStartService');
    }

    if (this.guidesToOrder()) {
      return this.translate('restaurantPos.service.nextActionAddOrder');
    }

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

  protected chargeButtonLabel(): string {
    return this.translate('restaurantPos.service.chargeWithTotal', { total: this.formatCurrency(this.order()?.total ?? 0) });
  }

  protected chargeButtonAriaLabel(): string {
    return this.translate('restaurantPos.service.chargeWithTotalActionLabel', { total: this.formatCurrency(this.order()?.total ?? 0) });
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

    const minutes = Math.max(0, Math.floor((this.durationNow() - new Date(value).getTime()) / 60000));
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

  protected paymentMethodLabel(paymentMethod: PaymentMethod | 'other'): string {
    return this.translate(`restaurantPos.payment.${paymentMethod}`);
  }

  protected paidOrders(): TableOrder[] {
    return this.serviceInfo()?.paidOrders ?? [];
  }

  protected paidOrderAmount(order: TableOrder): number {
    return order.lastCompletedPayment?.amount ?? order.total;
  }

  protected paidOrderTimestamp(order: TableOrder): string {
    const paidAt = order.lastCompletedPayment?.paidAt;
    if (!paidAt) {
      return this.translate('restaurantPos.service.paymentHistoryUnknownDate');
    }

    return new Intl.DateTimeFormat(this.activeLang(), {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(paidAt));
  }

  protected totalPaidAmount(): number {
    return this.paidOrders().reduce((sum, paidOrder) => sum + this.paidOrderAmount(paidOrder), 0);
  }

  protected paymentHistoryCountLabel(): string {
    return this.translate('restaurantPos.service.paymentHistoryCount', { count: this.paidOrders().length });
  }

  protected togglePaymentHistory(): void {
    this.paymentHistoryExpanded.update((expanded) => !expanded);
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

  protected canSubmitCharge(): boolean {
    // Con líneas pendientes el botón abre el diálogo de "enviar a cocina antes de cobrar",
    // así que no exige método de pago todavía (si no se elige, se cobra en efectivo).
    return this.canCharge() && !this.isCharging() && (this.hasSelectedPaymentMethod() || this.hasPendingLines());
  }

  protected hasPendingLines(): boolean {
    return (this.order()?.lines ?? []).some((line) => line.status === 'pending');
  }

  protected shouldShowPaymentMethodHint(): boolean {
    return this.canCharge() && !this.hasSelectedPaymentMethod();
  }

  protected canMarkCleaning(): boolean {
    return this.serviceInfo()?.canMarkCleaning ?? false;
  }

  protected canFreeTable(): boolean {
    return this.serviceInfo()?.canFreeTable ?? false;
  }

  protected isWorkflowSectionHighlighted(sectionId: string): boolean {
    return this.selectedServiceWorkflowSections().some((section) => section.id === sectionId && section.highlighted);
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

  protected isServedLineSelected(lineId: string): boolean {
    return this.servedLineIds().includes(lineId);
  }

  protected requestRemoveProduct(group: GroupedOrderLine): void {
    if (group.primaryLine.status === 'pending' && group.quantity === 1) {
      this.removeProduct.emit(group.primaryLine.id);
      return;
    }

    this.pendingRemovalGroup.set(group);
    this.removeProductConfirmOpen.set(true);
  }

  protected closeRemoveProductConfirm(): void {
    this.removeProductConfirmOpen.set(false);
    this.pendingRemovalGroup.set(null);
  }

  protected confirmRemoveProduct(): void {
    const currentGroup = this.currentRemovalGroup();
    if (currentGroup) {
      this.removeProduct.emit(currentGroup.primaryLine.id);
    }
    this.closeRemoveProductConfirm();
  }

  protected removeProductConfirmTitle(): string {
    const group = this.currentRemovalGroup();
    return group && group.primaryLine.status === 'pending' && group.quantity > 1
      ? this.translate('restaurantPos.service.removeGroupedConfirmTitle')
      : this.translate('restaurantPos.service.removeNonPendingConfirmTitle');
  }

  protected removeProductConfirmLabel(): string {
    const group = this.currentRemovalGroup();
    return group && group.primaryLine.status === 'pending' && group.quantity > 1
      ? this.translate('restaurantPos.service.confirmRemoveGrouped')
      : this.translate('restaurantPos.service.confirmRemoveNonPending');
  }

  protected removeProductConfirmDescription(): string {
    const group = this.currentRemovalGroup();
    if (group && group.primaryLine.status === 'pending' && group.quantity > 1) {
      return this.translate('restaurantPos.service.removeGroupedConfirmDescription', {
        count: group.quantity,
        name: group.primaryLine.productName,
      });
    }

    return this.translate('restaurantPos.service.removeNonPendingConfirmDescription', {
      name: group?.primaryLine.productName ?? '',
    });
  }

  private resolveCurrentRemovalGroup(): GroupedOrderLine | null {
    const requestedGroup = this.pendingRemovalGroup();
    if (!requestedGroup) {
      return null;
    }

    return this.groupedOrderCourses()
      .flatMap((course) => course.lines)
      .find((group) => group.key === requestedGroup.key) ?? null;
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

  private orderLineGroupKey(line: OrderLine): string {
    if (!this.canGroupOrderLine(line)) {
      return `line:${line.id}`;
    }

    const configuration = orderLineConfigurationIdentity(line.configurationSignature, [line.productId]);
    return [
      'group',
      line.course,
      line.productId,
      configuration.kind,
      configuration.kind === 'exact' ? configuration.value : '',
      Math.round(line.unitPrice * 100),
      line.status,
    ].join('::');
  }

  private canGroupOrderLine(line: OrderLine): boolean {
    return (
      line.productSnapshot.productType === 'simple' &&
      line.status === 'pending' &&
      !line.kitchenNote &&
      !line.note &&
      line.selectedModifiers.length === 0 &&
      (line.selectedComboSlots?.length ?? 0) === 0 &&
      (line.platterComponents?.length ?? 0) === 0
    );
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }
}
