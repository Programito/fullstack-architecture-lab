import { NgClass } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { OrderLine, OrderLineStatus, PreparationBoardCard, PreparationBoardColumn, PreparationBoardColumnId } from '../../models/restaurant-pos.models';

export interface PreparationLineMove {
  tableId: string;
  lineId: string;
  targetColumnId: PreparationBoardColumnId;
}

export interface PreparationLineCancel {
  tableId: string;
  lineId: string;
}

@Component({
  selector: 'app-preparation-board',
  imports: [CdkDrag, CdkDropList, Dialog, Icon, NgClass, TranslocoPipe],
  templateUrl: './preparation-board.html',
})
export class PreparationBoard {
  readonly columns = input<readonly PreparationBoardColumn[]>([]);
  readonly servedCards = input<readonly PreparationBoardCard[]>([]);
  readonly warning = input<string | null>(null);
  readonly lineMoved = output<PreparationLineMove>();
  readonly lineCancelled = output<PreparationLineCancel>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly currentTime = toSignal(timer(0, 30_000).pipe(map(() => Date.now())), { initialValue: Date.now() });

  private static readonly SLA_WARN_MINUTES = 5;
  private static readonly SLA_CRIT_MINUTES = 10;

  protected readonly connectedColumnIds: PreparationBoardColumnId[] = ['pending', 'preparing', 'ready'];
  protected readonly servedModalOpen = signal(false);
  protected readonly pendingCancelCardId = signal<string | null>(null);

  protected columnLabelKey(id: PreparationBoardColumnId): string {
    return `restaurantPos.preparationBoard.${id}`;
  }

  protected columnClass(id: PreparationBoardColumnId): string {
    switch (id) {
      case 'preparing':
        return 'border-amber-300 bg-amber-50/70 text-amber-950 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100';
      case 'ready':
        return 'border-emerald-300 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100';
      default:
        return 'border-slate-300 bg-slate-50/70 text-slate-950 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-100';
    }
  }

  protected handleDrop(event: CdkDragDrop<PreparationBoardCard[]>, targetColumnId: PreparationBoardColumnId): void {
    if (event.previousContainer === event.container) return;
    const card = event.item.data as PreparationBoardCard | undefined;
    if (card) this.moveCard(card, targetColumnId);
  }

  protected moveCard(card: PreparationBoardCard, targetColumnId: PreparationBoardColumnId): void {
    this.lineMoved.emit({ tableId: card.tableId, lineId: card.line.id, targetColumnId });
  }

  protected nextAction(columnId: PreparationBoardColumnId): PreparationBoardColumnId | null {
    if (columnId === 'pending') return 'preparing';
    if (columnId === 'preparing') return 'ready';
    return null;
  }

  protected nextActionLabel(columnId: PreparationBoardColumnId): string {
    if (columnId === 'pending') return this.translate('restaurantPos.preparationBoard.markPreparing');
    if (columnId === 'preparing') return this.translate('restaurantPos.preparationBoard.markReady');
    return '';
  }

  protected lineStatusLabel(status: OrderLineStatus): string {
    return this.translate(`restaurantPos.lineStatus.${status}`);
  }

  protected elapsedMinutes(card: PreparationBoardCard): number | null {
    if (!card.line.statusUpdatedAt) return null;
    return Math.floor((this.currentTime() - new Date(card.line.statusUpdatedAt).getTime()) / 60_000);
  }

  protected slaClass(card: PreparationBoardCard): string {
    const minutes = this.elapsedMinutes(card);
    if (minutes === null) return '';
    if (minutes >= PreparationBoard.SLA_CRIT_MINUTES) return 'sla-crit';
    if (minutes >= PreparationBoard.SLA_WARN_MINUTES) return 'sla-warn';
    return '';
  }

  protected hasModifiers(line: OrderLine): boolean {
    return line.selectedModifiers.length > 0;
  }

  protected modifierPillClass(type: string): string {
    return type === 'remove'
      ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200'
      : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300';
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

  protected stationLabel(card: PreparationBoardCard): string {
    return card.station ?? (card.preparationFlow === 'direct' ? this.translate('restaurantPos.preparationBoard.directStation') : '');
  }

  protected openServedModal(): void {
    this.pendingCancelCardId.set(null);
    this.servedModalOpen.set(true);
  }

  protected closeServedModal(): void {
    this.servedModalOpen.set(false);
    this.pendingCancelCardId.set(null);
  }

  protected requestCancel(card: PreparationBoardCard): void {
    this.pendingCancelCardId.set(card.line.id);
  }

  protected abortCancel(): void {
    this.pendingCancelCardId.set(null);
  }

  protected confirmCancel(card: PreparationBoardCard): void {
    this.lineCancelled.emit({ tableId: card.tableId, lineId: card.line.id });
    this.pendingCancelCardId.set(null);
  }

  protected trackColumn(_index: number, column: PreparationBoardColumn): PreparationBoardColumnId {
    return column.id;
  }

  protected trackCard(_index: number, card: PreparationBoardCard): string {
    return `${card.tableId}:${card.line.id}`;
  }

  private comboSlotProductLabel(product: NonNullable<OrderLine['selectedComboSlots']>[number]['selectedProducts'][number]): string {
    return product.supplementPrice > 0 ? `${product.productName} +${this.formatCurrency(product.supplementPrice)}` : product.productName;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }
}
