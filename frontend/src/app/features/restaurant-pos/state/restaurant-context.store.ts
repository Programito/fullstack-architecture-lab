import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { retry, type Subscription } from 'rxjs';

import { IdentitySessionStore } from '../../identity/identity-session.store';
import type { RestaurantSummaryDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';

@Injectable({
  providedIn: 'root',
})
export class RestaurantContextStore {
  private readonly api = inject(RestaurantPosApiService);
  private readonly identity = inject(IdentitySessionStore);
  private readonly _restaurants = signal<RestaurantSummaryDto[]>([]);
  private readonly _activeRestaurantId = signal<string | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _loadError = signal<string | null>(null);
  private hasCompletedLoad = false;
  private observedUserId = this.identity.session().userId;
  private loadGeneration = 0;
  private loadSubscription: Subscription | null = null;

  readonly restaurants = this._restaurants.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly loadError = this._loadError.asReadonly();
  readonly activeRestaurant = computed(
    () => this._restaurants().find((restaurant) => restaurant.id === this._activeRestaurantId()) ?? null,
  );
  readonly multipleRestaurants = computed(() => this._restaurants().length > 1);
  readonly hasNoRestaurants = computed(
    () => !this._isLoading() && this._restaurants().length === 0 && this._loadError() === null,
  );

  constructor() {
    effect(() => {
      const userId = this.identity.session().userId;
      if (userId === this.observedUserId) return;

      this.observedUserId = userId;
      untracked(() => this.resetRestaurantContext());
    });
  }

  setActiveRestaurantId(id: string): void {
    this._activeRestaurantId.set(id);
  }

  load(options: { force?: boolean } = {}): void {
    const userId = this.identity.session().userId;
    if (userId !== this.observedUserId) {
      this.observedUserId = userId;
      this.resetRestaurantContext();
    }

    if (this._isLoading() || (!options.force && (this.hasCompletedLoad || this._loadError() !== null))) {
      return;
    }

    const generation = ++this.loadGeneration;
    this._isLoading.set(true);
    this._loadError.set(null);

    this.loadSubscription = this.api.listRestaurants().pipe(
      // El backend o la base de datos pueden tardar en despertar (arranque en frío): reintentar
      // unas veces con pausa antes de dar el error por definitivo. Sin esto, entrar directamente
      // a una sección podía dejarla cargando para siempre si esta primera petición fallaba.
      retry({ count: 3, delay: 1500 }),
    ).subscribe({
      next: (restaurants) => {
        if (!this.isCurrentLoad(userId, generation)) return;
        this._restaurants.set(restaurants);
        this._activeRestaurantId.set(restaurants.length === 1 ? restaurants[0]!.id : null);
        this.hasCompletedLoad = true;
        this._isLoading.set(false);
      },
      error: () => {
        if (!this.isCurrentLoad(userId, generation)) return;
        this._loadError.set('restaurantPos.selector.loadError');
        this._isLoading.set(false);
      },
    });
  }

  private resetRestaurantContext(): void {
    this.loadGeneration += 1;
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = null;
    this.hasCompletedLoad = false;
    this._restaurants.set([]);
    this._activeRestaurantId.set(null);
    this._isLoading.set(false);
    this._loadError.set(null);
  }

  private isCurrentLoad(userId: string | null, generation: number): boolean {
    return this.identity.session().userId === userId && this.loadGeneration === generation;
  }
}
