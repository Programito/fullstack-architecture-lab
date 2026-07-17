import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { PreparationBoard, type PreparationLineCancel, type PreparationLineMove, type PreparationLineServe } from '../../components/preparation-board/preparation-board';
import type { PreparationBoardColumn, PreparationBoardColumnId } from '../../models/restaurant-pos.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { Icon } from '../../../../shared/ui/icon/icon';

const SOUND_WARMUP_MS = 5_000;

@Component({
  selector: 'app-restaurant-pos-kitchen-page',
  imports: [PreparationBoard, TranslocoPipe, Icon],
  templateUrl: './restaurant-pos-kitchen-page.html',
})
export class RestaurantPosKitchenPage {
  protected readonly store = inject(RestaurantPosStore);
  private readonly transloco = inject(TranslocoService);
  private readonly api = inject(RestaurantPosApiService);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly preparationWarning = signal<string | null>(null);
  protected readonly soundEnabled = signal(false);
  /** Búsqueda por nombre de plato (o número de mesa) para localizar una comanda de un vistazo. */
  protected readonly searchQuery = signal('');

  private readonly knownLineIds = new Set<string>();
  private warmupDone = false;

  protected readonly filteredPreparationColumns = computed<readonly PreparationBoardColumn[]>(() => {
    const query = this.normalizeSearch(this.searchQuery());
    const columns = this.store.preparationBoardColumns();
    if (!query) return columns;
    return columns.map((column) => ({
      ...column,
      cards: column.cards.filter(
        (card) =>
          this.normalizeSearch(card.line.productName).includes(query) ||
          `${card.tableNumber}` === query,
      ),
    }));
  });

  protected readonly pendingLineCount = computed(() =>
    this.countPreparationCards('pending'),
  );
  protected readonly readyLineCount = computed(() =>
    this.countPreparationCards('ready'),
  );
  protected readonly servedLineCount = computed(() =>
    this.store.servedPreparationCards().length,
  );

  constructor() {
    setTimeout(() => { this.warmupDone = true; }, SOUND_WARMUP_MS);

    effect(() => {
      const columns = this.store.preparationBoardColumns();
      untracked(() => this.detectAndChime(columns));
    });
  }

  protected toggleSound(): void {
    this.soundEnabled.update((v) => !v);
  }

  protected movePreparationLine(move: PreparationLineMove): void {
    const result = this.store.movePreparationLine(move.tableId, move.lineId, move.targetColumnId);

    this.preparationWarning.set(result.moved ? null : this.transloco.translate(result.messageKey ?? 'restaurantPos.preparationBoard.genericMoveError'));

    if (!result.moved) return;

    const restaurant = this.restaurantContext.activeRestaurant();
    const orderId = this.store.ordersByTable()[move.tableId]?.id;
    if (!restaurant || !orderId) return;

    const statusMap: Partial<Record<PreparationBoardColumnId, 'sent_to_kitchen' | 'preparing' | 'ready'>> = {
      pending: 'sent_to_kitchen',
      preparing: 'preparing',
      ready: 'ready',
    };

    const apiStatus = statusMap[move.targetColumnId];
    if (!apiStatus) return;

    this.api.updateRestaurantOrderLineStatus(restaurant.id, orderId, move.lineId, apiStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /**
   * Atajo de cocina: marca la línea como servida directamente desde el
   * tablero (columna "Preparado"), sin pasar por la página de Servicio.
   * El tablero ya ha pedido confirmación antes de emitir este evento.
   */
  protected servePreparationLine(serve: PreparationLineServe): void {
    this.store.markOrderLineServed(serve.tableId, serve.lineId);

    const restaurant = this.restaurantContext.activeRestaurant();
    const orderId = this.store.ordersByTable()[serve.tableId]?.id;
    if (!restaurant || !orderId) return;

    this.api.updateRestaurantOrderLineStatus(restaurant.id, orderId, serve.lineId, 'served')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected cancelPreparationLine(cancel: PreparationLineCancel): void {
    this.store.cancelPreparationLine(cancel.tableId, cancel.lineId);

    const restaurant = this.restaurantContext.activeRestaurant();
    const orderId = this.store.ordersByTable()[cancel.tableId]?.id;
    if (!restaurant || !orderId) return;

    this.api.cancelRestaurantOrderLine(restaurant.id, orderId, cancel.lineId, 'served_by_mistake')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private detectAndChime(columns: readonly PreparationBoardColumn[]): void {
    if (!this.warmupDone) return;

    const currentIds = columns.flatMap((col) => col.cards.map((card) => card.line.id));

    const hasNew = currentIds.some((id) => !this.knownLineIds.has(id));
    currentIds.forEach((id) => this.knownLineIds.add(id));

    if (hasNew && this.soundEnabled()) {
      this.playKitchenChime();
    }
  }

  private playKitchenChime(): void {
    try {
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1047, now + 0.12);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.5);
      osc.onended = () => ctx.close();
    } catch {
      // AudioContext unavailable
    }
  }

  private countPreparationCards(columnId: PreparationBoardColumnId): number {
    return this.store.preparationBoardColumns().find((column) => column.id === columnId)?.cards.length ?? 0;
  }

  private normalizeSearch(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
