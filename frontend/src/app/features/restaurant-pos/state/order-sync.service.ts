import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, switchMap, timer } from 'rxjs';
import { mapServiceFloor, mapServicePointOrder } from '../api/restaurant-pos-api.mappers';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantContextStore } from './restaurant-context.store';
import { RestaurantPosStore } from './restaurant-pos.store';

export const ORDER_SYNC_POLL_INTERVAL_MS = 30_000;

@Injectable()
export class OrderSyncService {
  private readonly store = inject(RestaurantPosStore);
  private readonly api = inject(RestaurantPosApiService);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    toObservable(this.restaurantContext.activeRestaurant).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap((restaurant) => {
        if (!restaurant) return EMPTY;
        return timer(0, ORDER_SYNC_POLL_INTERVAL_MS).pipe(
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
}
