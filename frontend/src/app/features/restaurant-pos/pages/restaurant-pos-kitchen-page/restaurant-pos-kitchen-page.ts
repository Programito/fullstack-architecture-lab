import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PreparationBoard, type PreparationLineMove } from '../../components/preparation-board/preparation-board';
import type { PreparationBoardColumnId } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

@Component({
  selector: 'app-restaurant-pos-kitchen-page',
  imports: [PreparationBoard, TranslocoPipe],
  templateUrl: './restaurant-pos-kitchen-page.html',
})
export class RestaurantPosKitchenPage {
  protected readonly store = inject(RestaurantPosStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly preparationWarning = signal<string | null>(null);

  protected readonly pendingLineCount = computed(() =>
    this.countPreparationCards('in_kitchen'),
  );
  protected readonly readyLineCount = computed(() =>
    this.countPreparationCards('ready'),
  );
  protected readonly servedLineCount = computed(() =>
    this.countPreparationCards('served'),
  );

  protected movePreparationLine(move: PreparationLineMove): void {
    const result = this.store.movePreparationLine(move.tableId, move.lineId, move.targetColumnId);

    this.preparationWarning.set(result.moved ? null : this.transloco.translate(result.messageKey ?? 'restaurantPos.preparationBoard.genericMoveError'));
  }

  private countPreparationCards(columnId: PreparationBoardColumnId): number {
    return this.store.preparationBoardColumns().find((column) => column.id === columnId)?.cards.length ?? 0;
  }
}
