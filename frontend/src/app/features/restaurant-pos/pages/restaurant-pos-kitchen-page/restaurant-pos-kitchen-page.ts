import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EMPTY, switchMap, timer } from 'rxjs';
import { mapServiceFloor, mapServicePointOrder } from '../../api/restaurant-pos-api.mappers';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { PreparationBoard, type PreparationLineMove } from '../../components/preparation-board/preparation-board';
import type { PreparationBoardColumnId } from '../../models/restaurant-pos.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

const KITCHEN_POLL_INTERVAL_MS = 30_000;

@Component({
  selector: 'app-restaurant-pos-kitchen-page',
  imports: [PreparationBoard, TranslocoPipe],
  templateUrl: './restaurant-pos-kitchen-page.html',
})
export class RestaurantPosKitchenPage {
  protected readonly store = inject(RestaurantPosStore);
  private readonly transloco = inject(TranslocoService);
  private readonly api = inject(RestaurantPosApiService);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly destroyRef = inject(DestroyRef);

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

  constructor() {
    this.restaurantContext.load();

    toObservable(this.restaurantContext.activeRestaurant).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap((restaurant) => {
        if (!restaurant) return EMPTY;
        return timer(0, KITCHEN_POLL_INTERVAL_MS).pipe(
          switchMap(() => this.api.getRestaurantServiceFloor(restaurant.id)),
        );
      }),
    ).subscribe((serviceFloor) => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant) return;

      this.store.hydrateServiceFloor(mapServiceFloor(serviceFloor));

      serviceFloor.servicePoints
        .filter((sp) => sp.summary.lineCount > 0)
        .forEach((sp) => {
          this.api.getRestaurantServicePointOrder(restaurant.id, sp.table.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order) => {
              this.store.hydrateServicePointOrder(sp.table.id, mapServicePointOrder(order));
            });
        });
    });
  }

  protected movePreparationLine(move: PreparationLineMove): void {
    const result = this.store.movePreparationLine(move.tableId, move.lineId, move.targetColumnId);

    this.preparationWarning.set(result.moved ? null : this.transloco.translate(result.messageKey ?? 'restaurantPos.preparationBoard.genericMoveError'));

    if (!result.moved) return;

    const restaurant = this.restaurantContext.activeRestaurant();
    const orderId = this.store.ordersByTable()[move.tableId]?.id;
    if (!restaurant || !orderId) return;

    const statusMap: Record<typeof move.targetColumnId, 'preparing' | 'ready' | 'served'> = {
      in_kitchen: 'preparing',
      ready: 'ready',
      served: 'served',
    };

    this.api.updateRestaurantOrderLineStatus(restaurant.id, orderId, move.lineId, statusMap[move.targetColumnId])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private countPreparationCards(columnId: PreparationBoardColumnId): number {
    return this.store.preparationBoardColumns().find((column) => column.id === columnId)?.cards.length ?? 0;
  }
}
