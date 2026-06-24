import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import type {
  CreateFloorElementRequest,
  ReorderFloorElementsRequest,
  RestaurantFloorsDto,
  RestaurantMenuDto,
  RestaurantSummaryDto,
  ServiceFloorDto,
  ServicePointDetailDto,
  ServicePointOrderDto,
  UpdateFloorElementRequest,
  UpdateFloorRequest,
} from './restaurant-pos-api.models';

@Injectable({
  providedIn: 'root',
})
export class RestaurantPosApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly restaurantsUrl = `${this.apiBaseUrl}/restaurants`;

  listRestaurants(): Observable<RestaurantSummaryDto[]> {
    return this.http.get<RestaurantSummaryDto[]>(this.restaurantsUrl);
  }

  getRestaurantMenu(restaurantId: string): Observable<RestaurantMenuDto> {
    return this.http.get<RestaurantMenuDto>(`${this.restaurantsUrl}/${restaurantId}/menu`);
  }

  getRestaurantFloors(restaurantId: string): Observable<RestaurantFloorsDto> {
    return this.http.get<RestaurantFloorsDto>(`${this.restaurantsUrl}/${restaurantId}/floors`);
  }

  getRestaurantServiceFloor(restaurantId: string): Observable<ServiceFloorDto> {
    return this.http.get<ServiceFloorDto>(`${this.restaurantsUrl}/${restaurantId}/service-floor`);
  }

  getRestaurantServicePoint(restaurantId: string, tableId: string): Observable<ServicePointDetailDto> {
    return this.http.get<ServicePointDetailDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}`);
  }

  getRestaurantServicePointOrder(restaurantId: string, tableId: string): Observable<ServicePointOrderDto> {
    return this.http.get<ServicePointOrderDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/order`);
  }

  occupyRestaurantServicePoint(restaurantId: string, tableId: string): Observable<ServicePointDetailDto> {
    return this.http.post<ServicePointDetailDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/occupy`, {});
  }

  sendRestaurantServicePointToKitchen(restaurantId: string, tableId: string): Observable<ServicePointDetailDto> {
    return this.http.post<ServicePointDetailDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/send-to-kitchen`, {});
  }

  markRestaurantServicePointServed(restaurantId: string, tableId: string): Observable<ServicePointDetailDto> {
    return this.http.post<ServicePointDetailDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/mark-served`, {});
  }

  chargeRestaurantServicePoint(restaurantId: string, tableId: string): Observable<ServicePointDetailDto> {
    return this.http.post<ServicePointDetailDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/charge`, {});
  }

  createFloorElement(
    restaurantId: string,
    floorId: string,
    request: CreateFloorElementRequest,
  ): Observable<RestaurantFloorsDto> {
    return this.http.post<RestaurantFloorsDto>(`${this.restaurantsUrl}/${restaurantId}/floors/${floorId}/elements`, request);
  }

  updateFloor(restaurantId: string, floorId: string, request: UpdateFloorRequest): Observable<RestaurantFloorsDto> {
    return this.http.patch<RestaurantFloorsDto>(`${this.restaurantsUrl}/${restaurantId}/floors/${floorId}`, request);
  }

  updateFloorElement(
    restaurantId: string,
    floorId: string,
    elementId: string,
    request: UpdateFloorElementRequest,
  ): Observable<RestaurantFloorsDto> {
    return this.http.patch<RestaurantFloorsDto>(`${this.restaurantsUrl}/${restaurantId}/floors/${floorId}/elements/${elementId}`, request);
  }

  reorderFloorElements(
    restaurantId: string,
    floorId: string,
    request: ReorderFloorElementsRequest,
  ): Observable<RestaurantFloorsDto> {
    return this.http.put<RestaurantFloorsDto>(`${this.restaurantsUrl}/${restaurantId}/floors/${floorId}/elements/reorder`, request);
  }
}
