import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import type {
  AddMenuSectionItemRequest,
  AddRestaurantOrderLineRequest,
  CancelRestaurantOrderLineRequest,
  CreateFloorElementRequest,
  CreateMenuSectionRequest,
  CreateRestaurantProductRequest,
  MenuItemAdminDto,
  MenuSectionAdminDto,
  OpenRestaurantOrderRequest,
  OrderPaymentMethodDto,
  ReorderFloorElementsRequest,
  ReorderItemsRequest,
  RestaurantFloorsDto,
  RestaurantMenuDto,
  RestaurantOrderDto,
  RestaurantProductDetailDto,
  RestaurantProductSummaryDto,
  RestaurantSummaryDto,
  ServiceFloorDto,
  ServicePointDetailDto,
  ServicePointOrderDto,
  UpdateFloorElementRequest,
  UpdateFloorRequest,
  UpdateMenuSectionItemRequest,
  UpdateMenuSectionRequest,
  UpdateRestaurantOrderLineRequest,
  UpdateRestaurantProductRequest,
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

  openRestaurantOrder(restaurantId: string, tableId: string, guestCount: number): Observable<RestaurantOrderDto> {
    const body: OpenRestaurantOrderRequest = { guestCount };
    return this.http.post<RestaurantOrderDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/orders`, body);
  }

  getRestaurantOrder(restaurantId: string, orderId: string): Observable<RestaurantOrderDto> {
    return this.http.get<RestaurantOrderDto>(`${this.restaurantsUrl}/${restaurantId}/orders/${orderId}`);
  }

  addRestaurantOrderLine(restaurantId: string, orderId: string, body: AddRestaurantOrderLineRequest): Observable<RestaurantOrderDto> {
    return this.http.post<RestaurantOrderDto>(`${this.restaurantsUrl}/${restaurantId}/orders/${orderId}/lines`, body);
  }

  updateRestaurantOrderLine(restaurantId: string, orderId: string, lineId: string, body: UpdateRestaurantOrderLineRequest): Observable<RestaurantOrderDto> {
    return this.http.patch<RestaurantOrderDto>(`${this.restaurantsUrl}/${restaurantId}/orders/${orderId}/lines/${lineId}`, body);
  }

  deleteRestaurantOrderLine(restaurantId: string, orderId: string, lineId: string): Observable<void> {
    return this.http.delete<void>(`${this.restaurantsUrl}/${restaurantId}/orders/${orderId}/lines/${lineId}`);
  }

  cancelRestaurantOrderLine(restaurantId: string, orderId: string, lineId: string, reason: string): Observable<RestaurantOrderDto> {
    const body: CancelRestaurantOrderLineRequest = { reason };
    return this.http.post<RestaurantOrderDto>(`${this.restaurantsUrl}/${restaurantId}/orders/${orderId}/lines/${lineId}/cancel`, body);
  }

  updateRestaurantOrderLineStatus(
    restaurantId: string,
    orderId: string,
    lineId: string,
    status: 'sent_to_kitchen' | 'preparing' | 'ready' | 'served',
  ): Observable<RestaurantOrderDto> {
    return this.http.patch<RestaurantOrderDto>(
      `${this.restaurantsUrl}/${restaurantId}/orders/${orderId}/lines/${lineId}/status`,
      { status },
    );
  }

  freeRestaurantServicePoint(restaurantId: string, tableId: string): Observable<ServicePointDetailDto> {
    return this.http.post<ServicePointDetailDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/free`, {});
  }

  registerRestaurantOrderPayment(restaurantId: string, orderId: string, amountCents: number, method: OrderPaymentMethodDto): Observable<RestaurantOrderDto> {
    return this.http.post<RestaurantOrderDto>(`${this.restaurantsUrl}/${restaurantId}/orders/${orderId}/payments`, { amountCents, method });
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

  setMenuItemAvailability(restaurantId: string, restaurantProductId: string, available: boolean): Observable<void> {
    return this.http.patch<void>(`${this.restaurantsUrl}/${restaurantId}/products/${restaurantProductId}/availability`, { available });
  }

  listRestaurantProducts(restaurantId: string): Observable<RestaurantProductSummaryDto[]> {
    return this.http.get<RestaurantProductSummaryDto[]>(`${this.restaurantsUrl}/${restaurantId}/products`);
  }

  getRestaurantProduct(restaurantId: string, productId: string): Observable<RestaurantProductDetailDto> {
    return this.http.get<RestaurantProductDetailDto>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}`);
  }

  createRestaurantProduct(restaurantId: string, body: CreateRestaurantProductRequest): Observable<RestaurantProductDetailDto> {
    return this.http.post<RestaurantProductDetailDto>(`${this.restaurantsUrl}/${restaurantId}/products`, body);
  }

  updateRestaurantProduct(restaurantId: string, productId: string, body: UpdateRestaurantProductRequest): Observable<RestaurantProductDetailDto> {
    return this.http.patch<RestaurantProductDetailDto>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}`, body);
  }

  deleteRestaurantProduct(restaurantId: string, productId: string): Observable<void> {
    return this.http.delete<void>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}`);
  }

  createMenuSection(restaurantId: string, menuId: string, body: CreateMenuSectionRequest): Observable<MenuSectionAdminDto> {
    return this.http.post<MenuSectionAdminDto>(`${this.restaurantsUrl}/${restaurantId}/menus/${menuId}/sections`, body);
  }

  updateMenuSection(restaurantId: string, menuId: string, sectionId: string, body: UpdateMenuSectionRequest): Observable<MenuSectionAdminDto> {
    return this.http.patch<MenuSectionAdminDto>(`${this.restaurantsUrl}/${restaurantId}/menus/${menuId}/sections/${sectionId}`, body);
  }

  deleteMenuSection(restaurantId: string, menuId: string, sectionId: string): Observable<void> {
    return this.http.delete<void>(`${this.restaurantsUrl}/${restaurantId}/menus/${menuId}/sections/${sectionId}`);
  }

  reorderMenuSections(restaurantId: string, menuId: string, body: ReorderItemsRequest): Observable<void> {
    return this.http.put<void>(`${this.restaurantsUrl}/${restaurantId}/menus/${menuId}/sections/reorder`, body);
  }

  addMenuSectionItem(restaurantId: string, menuId: string, sectionId: string, body: AddMenuSectionItemRequest): Observable<MenuItemAdminDto> {
    return this.http.post<MenuItemAdminDto>(`${this.restaurantsUrl}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items`, body);
  }

  updateMenuSectionItem(restaurantId: string, menuId: string, sectionId: string, itemId: string, body: UpdateMenuSectionItemRequest): Observable<MenuItemAdminDto> {
    return this.http.patch<MenuItemAdminDto>(`${this.restaurantsUrl}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/${itemId}`, body);
  }

  removeMenuSectionItem(restaurantId: string, menuId: string, sectionId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.restaurantsUrl}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/${itemId}`);
  }

  reorderMenuSectionItems(restaurantId: string, menuId: string, sectionId: string, body: ReorderItemsRequest): Observable<void> {
    return this.http.put<void>(`${this.restaurantsUrl}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/reorder`, body);
  }
}
