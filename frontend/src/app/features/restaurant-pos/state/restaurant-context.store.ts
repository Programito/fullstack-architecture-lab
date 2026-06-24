import { computed, inject, Injectable, signal } from '@angular/core';

import type { RestaurantSummaryDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';

@Injectable({
  providedIn: 'root',
})
export class RestaurantContextStore {
  private readonly api = inject(RestaurantPosApiService);
  private readonly _restaurants = signal<RestaurantSummaryDto[]>([]);
  private readonly _activeRestaurantId = signal<string | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _loadError = signal<string | null>(null);

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

  load(): void {
    if (this._isLoading()) {
      return;
    }

    this._isLoading.set(true);
    this._loadError.set(null);

    this.api.listRestaurants().subscribe({
      next: (restaurants) => {
        this._restaurants.set(restaurants);
        this._activeRestaurantId.set(restaurants.length === 1 ? restaurants[0]!.id : null);
        this._isLoading.set(false);
      },
      error: () => {
        this._loadError.set('restaurantPos.layout.errors.loadRestaurants');
        this._isLoading.set(false);
      },
    });
  }
}
