import { HttpErrorResponse } from '@angular/common/http';
import { effect, inject, Injectable, untracked } from '@angular/core';
import { catchError, concat, defer, EMPTY, filter, finalize, ignoreElements, map, type Observable, shareReplay, Subject, takeUntil, tap } from 'rxjs';

import { IdentitySessionStore } from '../../identity/identity-session.store';
import { mapServiceFloor } from '../api/restaurant-pos-api.mappers';
import type { ServiceFloorDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantPosStore } from './restaurant-pos.store';

const FLOOR_LOAD_ERROR = 'restaurantPos.floorLoading.loadError';

@Injectable({ providedIn: 'root' })
export class RestaurantFloorLoader {
  private readonly api = inject(RestaurantPosApiService);
  private readonly store = inject(RestaurantPosStore);
  private readonly identity = inject(IdentitySessionStore);
  private restaurantId: string | null = null;
  private observedUserId = this.identity.session().userId;
  private requestGeneration = 0;
  private inFlight: {
    restaurantId: string;
    generation: number;
    snapshot$: Observable<ServiceFloorDto>;
    cancel$: Subject<void>;
  } | null = null;

  constructor() {
    effect(() => {
      const userId = this.identity.session().userId;
      if (userId === this.observedUserId) return;

      this.observedUserId = userId;
      untracked(() => this.reset());
    });
  }

  load(restaurantId: string, options: { force?: boolean } = {}): void {
    this.syncUserContext();
    const sameRestaurant = this.restaurantId === restaurantId;
    if (!options.force && sameRestaurant) return;

    this.request(restaurantId, false).subscribe();
  }

  refresh(restaurantId: string): Observable<ServiceFloorDto> {
    this.syncUserContext();
    const sameRestaurant = this.restaurantId === restaurantId;

    if (sameRestaurant && this.inFlight) {
      const currentSnapshot$ = this.inFlight.snapshot$;
      return concat(
        currentSnapshot$.pipe(ignoreElements()),
        defer(() => {
          if (this.restaurantId !== restaurantId || this.store.floorLoadStatus() === 'error') return EMPTY;
          return this.request(restaurantId, true);
        }),
      );
    }

    if (sameRestaurant && this.store.floorLoadStatus() === 'error') {
      return EMPTY;
    }

    return this.request(restaurantId, sameRestaurant);
  }

  retry(restaurantId: string): void {
    this.load(restaurantId, { force: true });
  }

  reset(): void {
    this.invalidateRequestCache();
    this.store.beginFloorLoad();
  }

  private request(restaurantId: string, preserveViewport: boolean): Observable<ServiceFloorDto> {
    if (this.inFlight?.restaurantId === restaurantId) {
      return this.inFlight.snapshot$;
    }

    const supersededRequest = this.inFlight;
    this.restaurantId = restaurantId;
    const generation = ++this.requestGeneration;
    const userId = this.observedUserId;
    if (supersededRequest) {
      supersededRequest.cancel$.next();
      supersededRequest.cancel$.complete();
    }
    if (!preserveViewport) {
      this.store.beginFloorLoad();
    }
    const cancel$ = new Subject<void>();

    const snapshot$ = this.api.getRestaurantServiceFloor(restaurantId).pipe(
      takeUntil(cancel$),
      map((snapshot) => {
        if (!this.isCurrentRequest(restaurantId, generation, userId)) return null;
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
        if (!this.isCurrentRequest(restaurantId, generation, userId)) return EMPTY;
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.store.completeEmptyFloorLoad();
          return EMPTY;
        }
        if (!preserveViewport) {
          this.store.failFloorLoad(FLOOR_LOAD_ERROR);
        }
        return EMPTY;
      }),
      tap({ complete: () => this.clearInFlight(generation) }),
      finalize(() => {
        cancel$.complete();
        this.clearInFlight(generation);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.inFlight = { restaurantId, generation, snapshot$, cancel$ };
    return snapshot$;
  }

  private syncUserContext(): void {
    const userId = this.identity.session().userId;
    if (userId === this.observedUserId) return;

    this.observedUserId = userId;
    this.invalidateRequestCache();
  }

  private invalidateRequestCache(): void {
    const activeRequest = this.inFlight;
    this.restaurantId = null;
    this.requestGeneration += 1;
    this.inFlight = null;
    activeRequest?.cancel$.next();
    activeRequest?.cancel$.complete();
  }

  private isCurrentRequest(restaurantId: string, generation: number, userId: string | null): boolean {
    return (
      this.restaurantId === restaurantId &&
      this.requestGeneration === generation &&
      this.identity.session().userId === userId
    );
  }

  private clearInFlight(generation: number): void {
    if (this.inFlight?.generation === generation) {
      this.inFlight = null;
    }
  }
}
