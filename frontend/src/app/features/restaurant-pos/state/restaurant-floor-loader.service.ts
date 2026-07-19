import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { mapServiceFloor } from '../api/restaurant-pos-api.mappers';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantPosStore } from './restaurant-pos.store';

const FLOOR_LOAD_ERROR = 'restaurantPos.floorLoading.loadError';

@Injectable({ providedIn: 'root' })
export class RestaurantFloorLoader {
  private readonly api = inject(RestaurantPosApiService);
  private readonly store = inject(RestaurantPosStore);
  private restaurantId: string | null = null;
  private requestGeneration = 0;

  load(restaurantId: string, options: { force?: boolean } = {}): void {
    const sameRestaurant = this.restaurantId === restaurantId;
    if (!options.force && sameRestaurant && this.store.floorLoadStatus() !== 'error') return;

    this.restaurantId = restaurantId;
    const generation = ++this.requestGeneration;
    this.store.beginFloorLoad();

    this.api.getRestaurantServiceFloor(restaurantId).pipe(map(mapServiceFloor)).subscribe({
      next: (floor) => {
        if (generation !== this.requestGeneration) return;
        this.store.hydrateServiceFloor(floor);
      },
      error: (error: unknown) => {
        if (generation !== this.requestGeneration) return;
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.store.completeEmptyFloorLoad();
          return;
        }
        this.store.failFloorLoad(FLOOR_LOAD_ERROR);
      },
    });
  }

  retry(restaurantId: string): void {
    this.load(restaurantId, { force: true });
  }
}
