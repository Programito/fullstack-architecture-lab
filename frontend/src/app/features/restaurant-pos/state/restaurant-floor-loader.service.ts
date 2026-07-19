import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, EMPTY, filter, finalize, map, type Observable, shareReplay } from 'rxjs';

import { mapServiceFloor } from '../api/restaurant-pos-api.mappers';
import type { ServiceFloorDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantPosStore } from './restaurant-pos.store';

const FLOOR_LOAD_ERROR = 'restaurantPos.floorLoading.loadError';

@Injectable({ providedIn: 'root' })
export class RestaurantFloorLoader {
  private readonly api = inject(RestaurantPosApiService);
  private readonly store = inject(RestaurantPosStore);
  private restaurantId: string | null = null;
  private requestGeneration = 0;
  private inFlight: { restaurantId: string; generation: number; snapshot$: Observable<ServiceFloorDto> } | null = null;

  load(restaurantId: string, options: { force?: boolean } = {}): void {
    const sameRestaurant = this.restaurantId === restaurantId;
    if (!options.force && sameRestaurant) return;

    this.request(restaurantId, false).subscribe();
  }

  refresh(restaurantId: string): Observable<ServiceFloorDto> {
    const sameRestaurant = this.restaurantId === restaurantId;

    if (sameRestaurant && this.inFlight) {
      return this.inFlight.snapshot$;
    }

    if (sameRestaurant && this.store.floorLoadStatus() === 'error') {
      return EMPTY;
    }

    return this.request(restaurantId, sameRestaurant);
  }

  retry(restaurantId: string): void {
    this.load(restaurantId, { force: true });
  }

  private request(restaurantId: string, preserveViewport: boolean): Observable<ServiceFloorDto> {
    if (this.inFlight?.restaurantId === restaurantId) {
      return this.inFlight.snapshot$;
    }

    this.restaurantId = restaurantId;
    const generation = ++this.requestGeneration;
    if (!preserveViewport) {
      this.store.beginFloorLoad();
    }

    const snapshot$ = this.api.getRestaurantServiceFloor(restaurantId).pipe(
      map((snapshot) => {
        if (!this.isCurrentRequest(restaurantId, generation)) return null;
        if (snapshot.restaurantId !== restaurantId) {
          if (!preserveViewport) {
            this.store.failFloorLoad(FLOOR_LOAD_ERROR);
          }
          return null;
        }

        this.store.hydrateServiceFloor(mapServiceFloor(snapshot));
        return snapshot;
      }),
      filter((snapshot): snapshot is ServiceFloorDto => snapshot !== null),
      catchError((error: unknown) => {
        if (!this.isCurrentRequest(restaurantId, generation)) return EMPTY;
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.store.completeEmptyFloorLoad();
          return EMPTY;
        }
        if (!preserveViewport) {
          this.store.failFloorLoad(FLOOR_LOAD_ERROR);
        }
        return EMPTY;
      }),
      finalize(() => {
        if (this.inFlight?.generation === generation) {
          this.inFlight = null;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.inFlight = { restaurantId, generation, snapshot$ };
    return snapshot$;
  }

  private isCurrentRequest(restaurantId: string, generation: number): boolean {
    return this.restaurantId === restaurantId && this.requestGeneration === generation;
  }
}
