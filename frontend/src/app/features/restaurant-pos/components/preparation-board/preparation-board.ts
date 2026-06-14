import { NgClass } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { OrderLine, OrderLineStatus, PreparationBoardCard, PreparationBoardColumn, PreparationBoardColumnId } from '../../models/restaurant-pos.models';

export interface PreparationLineMove {
  tableId: string;
  lineId: string;
  targetColumnId: PreparationBoardColumnId;
}

@Component({
  selector: 'app-preparation-board',
  imports: [CdkDrag, CdkDropList, Icon, NgClass, TranslocoPipe],
  templateUrl: './preparation-board.html',
})
export class PreparationBoard {
  readonly columns = input<readonly PreparationBoardColumn[]>([]);
  readonly warning = input<string | null>(null);
  readonly lineMoved = output<PreparationLineMove>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  protected readonly connectedColumnIds: PreparationBoardColumnId[] = ['in_kitchen', 'ready', 'served'];

  protected columnLabelKey(id: PreparationBoardColumnId): string {
    return `restaurantPos.preparationBoard.${id}`;
  }

  protected columnClass(id: PreparationBoardColumnId): string {
    switch (id) {
      case 'ready':
        return 'border-emerald-300 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100';
      case 'served':
        return 'border-cyan-300 bg-cyan-50/70 text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-100';
      default:
        return 'border-amber-300 bg-amber-50/70 text-amber-950 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100';
    }
  }

  protected handleDrop(event: CdkDragDrop<PreparationBoardCard[]>, targetColumnId: PreparationBoardColumnId): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const card = event.item.data as PreparationBoardCard | undefined;

    if (card) {
      this.moveCard(card, targetColumnId);
    }
  }

  protected moveCard(card: PreparationBoardCard, targetColumnId: PreparationBoardColumnId): void {
    this.lineMoved.emit({ tableId: card.tableId, lineId: card.line.id, targetColumnId });
  }

  protected canShowReadyAction(columnId: PreparationBoardColumnId): boolean {
    return columnId === 'in_kitchen';
  }

  protected canShowServedAction(columnId: PreparationBoardColumnId): boolean {
    return columnId === 'in_kitchen' || columnId === 'ready';
  }

  protected lineStatusLabel(status: OrderLineStatus): string {
    return this.translate(`restaurantPos.lineStatus.${status}`);
  }

  protected hasModifiers(line: OrderLine): boolean {
    return line.selectedModifiers.length > 0;
  }

  protected modifierLabel(line: OrderLine): string {
    return line.selectedModifiers
      .map((modifier) => (modifier.type === 'remove' ? this.translate('restaurantPos.service.withoutModifier', { name: modifier.name }) : modifier.name))
      .join(', ');
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
