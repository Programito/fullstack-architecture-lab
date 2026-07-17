import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import type {
  AddMenuSectionItemRequest,
  AddRestaurantOrderLineRequest,
  CloseTimeEntryRequest,
  CancelRestaurantOrderLineRequest,
  CreateTimeEntryChangeRequest,
  CreateTimeEntryRequest,
  CreateCustomerRequest,
  CreateFloorElementRequest,
  CreateMenuSectionRequest,
  CreateProductImageUploadSignatureRequest,
  CreateRestaurantProductRequest,
  CreateRestaurantReservationRequest,
  CustomerSummaryDto,
  MenuItemAdminDto,
  MenuSectionAdminDto,
  MarkRestaurantServicePointServedRequest,
  OpenRestaurantOrderRequest,
  OrderPaymentMethodDto,
  ReorderFloorElementsRequest,
  ReorderItemsRequest,
  RestaurantFloorsDto,
  RestaurantMenuDto,
  RestaurantOrderDto,
  RestaurantReservationDto,
  RestaurantProductDetailDto,
  RestaurantProductSummaryDto,
  RestaurantSummaryDto,
  TimeEntryChangeRequestDto,
  TimeEntryDto,
  ServiceFloorDto,
  ServicePointDetailDto,
  ServicePointOrderDto,
  ServiceWindowDto,
  ProductImageUploadSignatureDto,
  UpdateFloorElementRequest,
  UpdateFloorRequest,
  UpdateMenuSectionItemRequest,
  UpdateMenuSectionRequest,
  UpdateRestaurantOrderLineRequest,
  UpdateRestaurantProductRequest,
  UpdateServiceWindowsRequest,
  CreateModifierGroupRequest,
  UpdateModifierGroupRequest,
  ReviewTimeEntryChangeRequest,
  RestaurantMenuModifierGroupDto,
  CreateComboSlotRequest,
  UpdateComboSlotRequest,
  ComboSlotAdminDto,
  CreatePlatterComponentRequest,
  UpdatePlatterComponentRequest,
  PlatterComponentAdminDto,
  TaxRateDto,
  CreateTaxRateRequest,
  UpdateTaxRateRequest,
  ModifierOptionOverrideDto,
  SetModifierOptionPriceOverrideRequest,
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

  getRestaurantReservations(restaurantId: string, date?: string): Observable<RestaurantReservationDto[]> {
    if (date) {
      return this.http.get<RestaurantReservationDto[]>(`${this.restaurantsUrl}/${restaurantId}/reservations`, { params: { date } });
    }
    return this.http.get<RestaurantReservationDto[]>(`${this.restaurantsUrl}/${restaurantId}/reservations`);
  }

  createRestaurantReservation(
    restaurantId: string,
    request: CreateRestaurantReservationRequest,
  ): Observable<RestaurantReservationDto> {
    return this.http.post<RestaurantReservationDto>(`${this.restaurantsUrl}/${restaurantId}/reservations`, request);
  }

  clockInRestaurantTimeEntry(restaurantId: string, request: CreateTimeEntryRequest): Observable<TimeEntryDto> {
    return this.http.post<TimeEntryDto>(`${this.restaurantsUrl}/${restaurantId}/time-entries/clock-in`, request);
  }

  clockOutRestaurantTimeEntry(restaurantId: string, timeEntryId: string, request: CloseTimeEntryRequest): Observable<TimeEntryDto> {
    return this.http.patch<TimeEntryDto>(`${this.restaurantsUrl}/${restaurantId}/time-entries/${timeEntryId}/clock-out`, request);
  }

  getMyRestaurantTimeEntries(restaurantId: string, dateFrom?: string, dateTo?: string): Observable<TimeEntryDto[]> {
    const params: Record<string, string> = {};
    if (dateFrom) params['dateFrom'] = dateFrom;
    if (dateTo) params['dateTo'] = dateTo;
    return this.http.get<TimeEntryDto[]>(`${this.restaurantsUrl}/${restaurantId}/time-entries/me`, { params });
  }

  getTeamRestaurantTimeEntries(
    restaurantId: string,
    filters?: { dateFrom?: string; dateTo?: string; status?: 'open' | 'closed' | 'corrected'; workerUserId?: string },
  ): Observable<TimeEntryDto[]> {
    const params: Record<string, string> = {};
    if (filters?.dateFrom) params['dateFrom'] = filters.dateFrom;
    if (filters?.dateTo) params['dateTo'] = filters.dateTo;
    if (filters?.status) params['status'] = filters.status;
    if (filters?.workerUserId) params['workerUserId'] = filters.workerUserId;
    return this.http.get<TimeEntryDto[]>(`${this.restaurantsUrl}/${restaurantId}/time-entries/team`, { params });
  }

  createRestaurantTimeEntryChangeRequest(
    restaurantId: string,
    request: CreateTimeEntryChangeRequest,
  ): Observable<TimeEntryChangeRequestDto> {
    return this.http.post<TimeEntryChangeRequestDto>(`${this.restaurantsUrl}/${restaurantId}/time-entry-change-requests`, request);
  }

  getRestaurantTimeEntryChangeRequests(
    restaurantId: string,
    status?: 'pending' | 'approved' | 'rejected',
  ): Observable<TimeEntryChangeRequestDto[]> {
    const params = status ? { status } : undefined;
    return this.http.get<TimeEntryChangeRequestDto[]>(`${this.restaurantsUrl}/${restaurantId}/time-entry-change-requests`, { params });
  }

  reviewRestaurantTimeEntryChangeRequest(
    restaurantId: string,
    requestId: string,
    request: ReviewTimeEntryChangeRequest,
  ): Observable<TimeEntryChangeRequestDto> {
    return this.http.patch<TimeEntryChangeRequestDto>(
      `${this.restaurantsUrl}/${restaurantId}/time-entry-change-requests/${requestId}/review`,
      request,
    );
  }

  confirmRestaurantReservation(restaurantId: string, reservationId: string): Observable<RestaurantReservationDto> {
    return this.http.patch<RestaurantReservationDto>(
      `${this.restaurantsUrl}/${restaurantId}/reservations/${reservationId}/confirm`,
      {},
    );
  }

  seatRestaurantReservation(restaurantId: string, reservationId: string): Observable<RestaurantReservationDto> {
    return this.http.patch<RestaurantReservationDto>(
      `${this.restaurantsUrl}/${restaurantId}/reservations/${reservationId}/seat`,
      {},
    );
  }

  markRestaurantReservationNoShow(restaurantId: string, reservationId: string): Observable<RestaurantReservationDto> {
    return this.http.patch<RestaurantReservationDto>(
      `${this.restaurantsUrl}/${restaurantId}/reservations/${reservationId}/no-show`,
      {},
    );
  }

  cancelRestaurantReservation(restaurantId: string, reservationId: string): Observable<RestaurantReservationDto> {
    return this.http.patch<RestaurantReservationDto>(
      `${this.restaurantsUrl}/${restaurantId}/reservations/${reservationId}/cancel`,
      {},
    );
  }

  occupyRestaurantServicePoint(restaurantId: string, tableId: string): Observable<ServicePointDetailDto> {
    return this.http.post<ServicePointDetailDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/occupy`, {});
  }

  sendRestaurantServicePointToKitchen(restaurantId: string, tableId: string): Observable<ServicePointDetailDto> {
    return this.http.post<ServicePointDetailDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/send-to-kitchen`, {});
  }

  markRestaurantServicePointServed(
    restaurantId: string,
    tableId: string,
    request: MarkRestaurantServicePointServedRequest = {},
  ): Observable<ServicePointDetailDto> {
    return this.http.post<ServicePointDetailDto>(`${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/mark-served`, request);
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

  getProductImageUploadSignature(
    restaurantId: string,
    body: CreateProductImageUploadSignatureRequest,
  ): Observable<ProductImageUploadSignatureDto> {
    return this.http.post<ProductImageUploadSignatureDto>(
      `${this.restaurantsUrl}/${restaurantId}/products/image-upload-signature`,
      body,
    );
  }

  deleteRestaurantProduct(restaurantId: string, productId: string): Observable<void> {
    return this.http.delete<void>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}`);
  }

  listModifierGroups(restaurantId: string, scope?: 'shared' | 'product'): Observable<RestaurantMenuModifierGroupDto[]> {
    const url = `${this.restaurantsUrl}/${restaurantId}/modifier-groups`;
    return this.http.get<RestaurantMenuModifierGroupDto[]>(scope ? `${url}?scope=${scope}` : url);
  }

  createModifierGroup(restaurantId: string, body: CreateModifierGroupRequest): Observable<RestaurantMenuModifierGroupDto> {
    return this.http.post<RestaurantMenuModifierGroupDto>(`${this.restaurantsUrl}/${restaurantId}/modifier-groups`, body);
  }

  updateModifierGroup(restaurantId: string, groupId: string, body: UpdateModifierGroupRequest): Observable<RestaurantMenuModifierGroupDto> {
    return this.http.patch<RestaurantMenuModifierGroupDto>(`${this.restaurantsUrl}/${restaurantId}/modifier-groups/${groupId}`, body);
  }

  deleteModifierGroup(restaurantId: string, groupId: string): Observable<void> {
    return this.http.delete<void>(`${this.restaurantsUrl}/${restaurantId}/modifier-groups/${groupId}`);
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

  getRestaurantServiceWindows(restaurantId: string): Observable<ServiceWindowDto[]> {
    return this.http.get<ServiceWindowDto[]>(`${this.restaurantsUrl}/${restaurantId}/service-windows`);
  }

  updateRestaurantServiceWindows(restaurantId: string, body: UpdateServiceWindowsRequest): Observable<ServiceWindowDto[]> {
    return this.http.put<ServiceWindowDto[]>(`${this.restaurantsUrl}/${restaurantId}/service-windows`, body);
  }

  searchCustomers(restaurantId: string, q: string): Observable<CustomerSummaryDto[]> {
    return this.http.get<CustomerSummaryDto[]>(`${this.restaurantsUrl}/${restaurantId}/customers`, { params: { q } });
  }

  createCustomer(restaurantId: string, body: CreateCustomerRequest): Observable<CustomerSummaryDto> {
    return this.http.post<CustomerSummaryDto>(`${this.restaurantsUrl}/${restaurantId}/customers`, body);
  }

  // ── Combo slots (admin) ─────────────────────────────────────────────────────

  createComboSlot(restaurantId: string, productId: string, body: CreateComboSlotRequest): Observable<ComboSlotAdminDto> {
    return this.http.post<ComboSlotAdminDto>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}/combo-slots`, body);
  }

  updateComboSlot(restaurantId: string, productId: string, slotId: string, body: UpdateComboSlotRequest): Observable<ComboSlotAdminDto> {
    return this.http.patch<ComboSlotAdminDto>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}/combo-slots/${slotId}`, body);
  }

  deleteComboSlot(restaurantId: string, productId: string, slotId: string): Observable<void> {
    return this.http.delete<void>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}/combo-slots/${slotId}`);
  }

  // ── Platter components (admin) ──────────────────────────────────────────────

  createPlatterComponent(restaurantId: string, productId: string, body: CreatePlatterComponentRequest): Observable<PlatterComponentAdminDto> {
    return this.http.post<PlatterComponentAdminDto>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}/platter-components`, body);
  }

  updatePlatterComponent(restaurantId: string, productId: string, componentId: string, body: UpdatePlatterComponentRequest): Observable<PlatterComponentAdminDto> {
    return this.http.patch<PlatterComponentAdminDto>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}/platter-components/${componentId}`, body);
  }

  deletePlatterComponent(restaurantId: string, productId: string, componentId: string): Observable<void> {
    return this.http.delete<void>(`${this.restaurantsUrl}/${restaurantId}/products/${productId}/platter-components/${componentId}`);
  }

  // ── Tipos de IVA (admin) ────────────────────────────────────────────────────

  listTaxRates(restaurantId: string): Observable<TaxRateDto[]> {
    return this.http.get<TaxRateDto[]>(`${this.restaurantsUrl}/${restaurantId}/tax-rates`);
  }

  createTaxRate(restaurantId: string, body: CreateTaxRateRequest): Observable<TaxRateDto> {
    return this.http.post<TaxRateDto>(`${this.restaurantsUrl}/${restaurantId}/tax-rates`, body);
  }

  updateTaxRate(restaurantId: string, taxRateId: string, body: UpdateTaxRateRequest): Observable<TaxRateDto> {
    return this.http.patch<TaxRateDto>(`${this.restaurantsUrl}/${restaurantId}/tax-rates/${taxRateId}`, body);
  }

  deleteTaxRate(restaurantId: string, taxRateId: string): Observable<void> {
    return this.http.delete<void>(`${this.restaurantsUrl}/${restaurantId}/tax-rates/${taxRateId}`);
  }

  // ── Precios de modificador por producto (overrides) ─────────────────────────

  listModifierOptionOverrides(restaurantId: string, productId: string): Observable<ModifierOptionOverrideDto[]> {
    return this.http.get<ModifierOptionOverrideDto[]>(
      `${this.restaurantsUrl}/${restaurantId}/products/${productId}/modifier-option-overrides`,
    );
  }

  setModifierOptionPriceOverride(
    restaurantId: string,
    productId: string,
    modifierOptionId: string,
    body: SetModifierOptionPriceOverrideRequest,
  ): Observable<ModifierOptionOverrideDto> {
    return this.http.put<ModifierOptionOverrideDto>(
      `${this.restaurantsUrl}/${restaurantId}/products/${productId}/modifier-options/${modifierOptionId}/price-override`,
      body,
    );
  }

  clearModifierOptionPriceOverride(restaurantId: string, productId: string, modifierOptionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.restaurantsUrl}/${restaurantId}/products/${productId}/modifier-options/${modifierOptionId}/price-override`,
    );
  }
}
