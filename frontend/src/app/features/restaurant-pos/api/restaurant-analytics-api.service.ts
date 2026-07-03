import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import type { RestaurantAnalyticsFilters, RestaurantAnalyticsReportDto } from './restaurant-analytics.models';

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  response$: Observable<RestaurantAnalyticsReportDto>;
};

@Injectable({ providedIn: 'root' })
export class RestaurantAnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly cache = new Map<string, CacheEntry>();

  getReport(restaurantId: string, filters: RestaurantAnalyticsFilters): Observable<RestaurantAnalyticsReportDto> {
    const key = `${restaurantId}|${filters.from}|${filters.to}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response$;
    }

    const params = new HttpParams().set('from', filters.from).set('to', filters.to);
    const response$ = this.http
      .get<RestaurantAnalyticsReportDto>(`${this.apiBaseUrl}/restaurants/${restaurantId}/analytics/report`, { params })
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, response$ });
    return response$;
  }
}
