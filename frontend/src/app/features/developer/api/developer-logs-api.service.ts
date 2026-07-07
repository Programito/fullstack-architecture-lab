import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import type {
  DeveloperLogBreakdownDto,
  DeveloperLogEventsResponseDto,
  DeveloperLogFilters,
  DeveloperLogSummaryDto,
  DeveloperLogTimelinePointDto,
  PickerOptionDto,
  RestaurantOptionDto,
} from './developer-logs.models';

@Injectable({ providedIn: 'root' })
export class DeveloperLogsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly baseUrl = `${this.apiBaseUrl}/developer/logs`;

  getRestaurantOptions(): Observable<RestaurantOptionDto[]> {
    return this.http.get<RestaurantOptionDto[]>(`${this.apiBaseUrl}/restaurants`);
  }

  getActorOptions(): Observable<PickerOptionDto[]> {
    return this.http.get<PickerOptionDto[]>(`${this.baseUrl}/actor-options`);
  }

  getEntityOptions(entityType: string, restaurantId: string): Observable<PickerOptionDto[]> {
    let params = new HttpParams().set('entityType', entityType);
    if (restaurantId.trim()) params = params.set('restaurantId', restaurantId.trim());
    return this.http.get<PickerOptionDto[]>(`${this.baseUrl}/entity-options`, { params });
  }

  getSummary(filters: DeveloperLogFilters): Observable<DeveloperLogSummaryDto> {
    return this.http.get<DeveloperLogSummaryDto>(`${this.baseUrl}/summary`, { params: this.buildParams(filters) });
  }

  getTimeline(filters: DeveloperLogFilters): Observable<DeveloperLogTimelinePointDto[]> {
    return this.http.get<DeveloperLogTimelinePointDto[]>(`${this.baseUrl}/timeline`, { params: this.buildParams(filters) });
  }

  getBreakdown(filters: DeveloperLogFilters): Observable<DeveloperLogBreakdownDto> {
    return this.http.get<DeveloperLogBreakdownDto>(`${this.baseUrl}/breakdown`, { params: this.buildParams(filters) });
  }

  getEvents(filters: DeveloperLogFilters, page: number, pageSize: number): Observable<DeveloperLogEventsResponseDto> {
    return this.http.get<DeveloperLogEventsResponseDto>(`${this.baseUrl}/events`, {
      params: this.buildParams(filters)
        .set('page', page)
        .set('pageSize', pageSize),
    });
  }

  private buildParams(filters: DeveloperLogFilters): HttpParams {
    let params = new HttpParams()
      .set('from', filters.from)
      .set('to', filters.to);

    if (filters.level) params = params.set('level', filters.level);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.clientOrigin) params = params.set('clientOrigin', filters.clientOrigin);
    if (filters.path.trim()) params = params.set('path', filters.path.trim());
    if (filters.actorUserId.trim()) params = params.set('actorUserId', filters.actorUserId.trim());
    if (filters.restaurantId.trim()) params = params.set('restaurantId', filters.restaurantId.trim());
    if (filters.entityType.trim()) params = params.set('entityType', filters.entityType.trim());
    if (filters.entityId.trim()) params = params.set('entityId', filters.entityId.trim());
    if (filters.result) params = params.set('result', filters.result);
    if (filters.search.trim()) params = params.set('search', filters.search.trim());

    return params;
  }
}
