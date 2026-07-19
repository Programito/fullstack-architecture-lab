import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, EMPTY, filter, merge, switchMap, timer } from 'rxjs';
import { mapServicePointOrder } from '../api/restaurant-pos-api.mappers';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RestaurantContextStore } from './restaurant-context.store';
import { RestaurantFloorLoader } from './restaurant-floor-loader.service';
import { OrderWriteService } from './order-write.service';

export const ORDER_SYNC_POLL_INTERVAL_MS = 30_000;
const REALTIME_INVALIDATION_DEBOUNCE_MS = 300;

@Injectable()
export class OrderSyncService {
  private readonly api = inject(RestaurantPosApiService);
  private readonly floorLoader = inject(RestaurantFloorLoader);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly orderWrite = inject(OrderWriteService);

  constructor() {
    toObservable(this.restaurantContext.activeRestaurant).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap((restaurant) => {
        if (!restaurant) return EMPTY;
        const poll$ = timer(0, ORDER_SYNC_POLL_INTERVAL_MS);
        const invalidated$ = this.realtime.invalidated$.pipe(
          filter((event) => event.restaurantId === restaurant.id),
          debounceTime(REALTIME_INVALIDATION_DEBOUNCE_MS),
        );
        return merge(poll$, invalidated$).pipe(
          // A single failed request (e.g. an expired session mid-refresh) must not
          // kill the polling stream for the rest of the session.
          switchMap(() => this.floorLoader.refresh(restaurant.id)),
        );
      }),
    ).subscribe((serviceFloor) => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant || restaurant.id !== serviceFloor.restaurantId) return;

      serviceFloor.servicePoints
        .filter((sp) => sp.summary.lineCount > 0)
        .forEach((sp) => {
          // Se captura la época antes de lanzar el GET: si el usuario muta el pedido
          // mientras la respuesta viaja, la hidratación se descarta como obsoleta.
          const expectedEpoch = this.orderWrite.orderMutationEpoch(sp.table.id);
          this.api.getRestaurantServicePointOrder(restaurant.id, sp.table.id)
            .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => EMPTY))
            .subscribe((order) => {
              this.orderWrite.hydrateRemoteOrder(sp.table.id, mapServicePointOrder(order), expectedEpoch);
            });
        });
    });
  }
}
