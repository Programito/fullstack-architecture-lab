import { NgClass } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { KitchenBoardColumn, KitchenBoardStatus, KitchenOrderTicket, OrderLine } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

@Component({
  selector: 'app-restaurant-pos-kitchen-page',
  imports: [Button, Icon, NgClass, RouterLink, TranslocoPipe],
  templateUrl: './restaurant-pos-kitchen-page.html',
})
export class RestaurantPosKitchenPage {
  protected readonly store = inject(RestaurantPosStore);
  private readonly transloco = inject(TranslocoService);

  protected readonly pendingLineCount = computed(() =>
    this.countLinesByStatus('sent_to_kitchen'),
  );
  protected readonly preparingLineCount = computed(() =>
    this.countLinesByStatus('preparing'),
  );
  protected readonly readyLineCount = computed(() =>
    this.countLinesByStatus('ready'),
  );
  protected readonly kitchenBoardColumns = computed(() => this.store.kitchenBoardColumns());

  protected markPreparing(tableId: string, productId: string): void {
    this.store.markOrderLinePreparing(tableId, productId);
  }

  protected markReady(tableId: string, productId: string): void {
    this.store.markOrderLineReady(tableId, productId);
  }

  protected moveBack(tableId: string, productId: string): void {
    this.store.moveOrderLineBackInKitchen(tableId, productId);
  }

  protected archiveLine(tableId: string, productId: string): void {
    this.store.archiveOrderLineFromKitchen(tableId, productId);
  }

  protected ticketTitle(ticket: KitchenOrderTicket): string {
    return ticket.servicePoint?.label ?? this.transloco.translate('restaurantPos.service.tableTitle', { number: ticket.table.number });
  }

  protected ticketElapsedLabel(ticket: KitchenOrderTicket): string {
    const oldestSentAt = ticket.lines
      .map((line) => line.sentToKitchenAt)
      .filter((sentAt): sentAt is string => !!sentAt)
      .sort()[0];

    return this.transloco.translate('restaurantPos.kitchen.ticketElapsed', { time: this.elapsedTimeLabel(oldestSentAt) });
  }

  protected lineElapsedLabel(line: OrderLine): string {
    return this.transloco.translate('restaurantPos.kitchen.lineElapsed', { time: this.elapsedTimeLabel(line.sentToKitchenAt) });
  }

  protected lineStatusLabel(line: OrderLine): string {
    return this.transloco.translate(`restaurantPos.lineStatus.${line.status}`);
  }

  protected columnTitle(status: KitchenBoardStatus): string {
    return this.transloco.translate(`restaurantPos.kitchen.columns.${status}.title`);
  }

  protected columnDescription(status: KitchenBoardStatus): string {
    return this.transloco.translate(`restaurantPos.kitchen.columns.${status}.description`);
  }

  protected columnEmptyLabel(status: KitchenBoardStatus): string {
    return this.transloco.translate(`restaurantPos.kitchen.columns.${status}.empty`);
  }

  protected columnLineCount(column: KitchenBoardColumn): number {
    return column.tickets.reduce((count, ticket) => count + ticket.lines.length, 0);
  }

  protected primaryActionLabel(line: OrderLine): string {
    if (line.status === 'sent_to_kitchen') {
      return this.transloco.translate('restaurantPos.kitchen.startPreparing');
    }

    if (line.status === 'preparing') {
      return this.transloco.translate('restaurantPos.kitchen.markReady');
    }

    return this.transloco.translate('restaurantPos.kitchen.archive');
  }

  protected primaryActionAriaLabel(line: OrderLine): string {
    if (line.status === 'sent_to_kitchen') {
      return this.transloco.translate('restaurantPos.kitchen.startPreparingActionLabel', { name: line.productName });
    }

    if (line.status === 'preparing') {
      return this.transloco.translate('restaurantPos.kitchen.markReadyActionLabel', { name: line.productName });
    }

    return this.transloco.translate('restaurantPos.kitchen.archiveActionLabel', { name: line.productName });
  }

  protected moveBackAriaLabel(line: OrderLine): string {
    return this.transloco.translate('restaurantPos.kitchen.moveBackActionLabel', { name: line.productName });
  }

  protected canMoveBack(line: OrderLine): boolean {
    return line.status === 'preparing' || line.status === 'ready';
  }

  protected isReady(line: OrderLine): boolean {
    return line.status === 'ready';
  }

  protected lineCardClass(line: OrderLine): string {
    if (line.status === 'ready') {
      return 'border-emerald-300 bg-emerald-50/80 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-100';
    }

    if (line.status === 'preparing') {
      return 'border-amber-300 bg-amber-50/80 text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100';
    }

    return 'theme-soft-panel';
  }

  protected handlePrimaryAction(ticket: KitchenOrderTicket, line: OrderLine): void {
    if (line.status === 'sent_to_kitchen') {
      this.markPreparing(ticket.table.id, line.productId);
      return;
    }

    if (line.status === 'preparing') {
      this.markReady(ticket.table.id, line.productId);
      return;
    }

    if (line.status === 'ready') {
      this.archiveLine(ticket.table.id, line.productId);
    }
  }

  private elapsedTimeLabel(startedAt: string | undefined): string {
    if (!startedAt) {
      return this.transloco.translate('restaurantPos.kitchen.elapsedPending');
    }

    const elapsedMilliseconds = Math.max(0, Date.now() - new Date(startedAt).getTime());
    const elapsedMinutes = Math.floor(elapsedMilliseconds / 60000);

    if (elapsedMinutes < 1) {
      return this.transloco.translate('restaurantPos.kitchen.elapsedLessThanMinute');
    }

    return this.transloco.translate('restaurantPos.kitchen.elapsedMinutes', { count: elapsedMinutes });
  }

  private countLinesByStatus(status: KitchenBoardStatus): number {
    return this.store.kitchenTickets().reduce((count, ticket) => count + ticket.lines.filter((line) => line.status === status).length, 0);
  }
}
