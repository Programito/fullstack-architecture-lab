export type RestaurantElementType = 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';

export type RestaurantElementShape = 'round' | 'square' | 'rectangle' | 'long';

export type RestaurantSummaryDto = {
  id: string;
  organizationId: string;
  name: string;
  displayName: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
};

export type RestaurantTableDto = {
  id: string;
  tableNumber: number;
  name: string | null;
  capacity: number;
  isActive: boolean;
};

export type RestaurantFloorElementDto = {
  id: string;
  type: RestaurantElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tableId: string | null;
  shape: RestaurantElementShape | null;
  sortOrder: number;
};

export type RestaurantFloorDto = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  elements: RestaurantFloorElementDto[];
};

export type RestaurantFloorsDto = {
  restaurantId: string;
  tables: RestaurantTableDto[];
  floors: RestaurantFloorDto[];
};

export type ServiceTableStatusDto = 'free' | 'occupied' | 'waiting_kitchen' | 'served' | 'payment_pending' | 'paid' | 'cleaning' | 'reserved';

export type ServicePhaseCourseDto = 'drinks' | 'starters' | 'mains' | 'desserts' | 'mixed' | 'none';

export type ServicePhaseStatusDto = 'no_order' | 'pending' | 'in_progress' | 'ready' | 'served';

export type ServiceFloorDto = {
  restaurantId: string;
  floor: {
    id: string;
    name: string;
    rows: number;
    columns: number;
  };
  elements: Array<{
    id: string;
    type: RestaurantElementType;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: RestaurantElementShape | null;
    tableId: string | null;
  }>;
  servicePoints: Array<{
    table: {
      id: string;
      tableNumber: number;
      name: string | null;
      capacity: number;
      status: ServiceTableStatusDto;
      serviceStartedAt: string | null;
    };
    summary: {
      lineCount: number;
      guestCount: number;
      totalCents: number;
      currency: string;
      servicePhase: {
        course: ServicePhaseCourseDto;
        status: ServicePhaseStatusDto;
      };
    };
  }>;
  totals: {
    servicePointCount: number;
    occupiedCount: number;
    openOrderCount: number;
  };
};

export type ServicePointDetailDto = {
  table: {
    id: string;
    tableNumber: number;
    name: string | null;
    capacity: number;
    status: ServiceTableStatusDto;
    occupiedAt: string | null;
    serviceStartedAt: string | null;
  };
  floorElement: {
    id: string;
    label: string;
    type: RestaurantElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: RestaurantElementShape | null;
  } | null;
  serviceInfo: {
    guestCount: number;
    lineCount: number;
    totalCents: number;
    currency: string;
    servicePhase: {
      course: ServicePhaseCourseDto;
      status: ServicePhaseStatusDto;
    };
    durationMinutes: number;
  };
};

export type ServiceOrderStatusDto = 'open' | 'sent_to_kitchen' | 'served' | 'payment_pending' | 'paid';

export type ServiceOrderLineStatusDto = 'pending' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'picked_up' | 'served' | 'cancelled';

export type ServicePointOrderLineDto = {
  id: string;
  productName: string;
  productType: 'simple' | 'combo' | 'platter';
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  status: ServiceOrderLineStatusDto;
  course: ServicePhaseCourseDto;
  preparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  kitchenNote: string | null;
  updatedAt: string;
  modifiers: Array<{ groupName: string; optionName: string; priceDeltaCents: number; quantity: number }>;
  comboSlots: Array<{ slotName: string; selectedProductName: string; supplementPriceCents: number; quantity: number }>;
};

export type ServicePointOrderDto = {
  order: {
    id: string;
    tableId: string;
    status: ServiceOrderStatusDto;
    openedAt: string;
    updatedAt: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    currency: string;
  } | null;
  lines: ServicePointOrderLineDto[];
};

export type RestaurantReservationTableDto = {
  id: string;
  tableNumber: number;
  name: string | null;
};

export type RestaurantReservationDto = {
  id: string;
  customerId: string | null;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  partySize: number;
  reservationAt: string;
  durationMinutes: number;
  status: 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show';
  notes: string | null;
  tableIds: string[];
  tables: RestaurantReservationTableDto[];
};

export type TimeEntryStatusDto = 'open' | 'closed' | 'corrected';
export type TimeEntryChangeRequestStatusDto = 'pending' | 'approved' | 'rejected';

export type TimeEntryDto = {
  id: string;
  userId: string;
  restaurantId: string;
  clockInAt: string;
  clockOutAt: string | null;
  clockInNote: string | null;
  clockOutNote: string | null;
  status: TimeEntryStatusDto;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type TimeEntryChangeRequestDto = {
  id: string;
  restaurantId: string;
  status: TimeEntryChangeRequestStatusDto;
  reason: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
  requestedClockInNote: string | null;
  requestedClockOutNote: string | null;
  createdAt: string;
  updatedAt: string;
  timeEntry: TimeEntryDto;
  requestedByUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewedByUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export type CreateTimeEntryRequest = {
  clockInAt: string;
  clockInNote: string | null;
};

export type CloseTimeEntryRequest = {
  clockOutAt: string;
  clockOutNote: string | null;
};

export type CreateTimeEntryChangeRequest = {
  timeEntryId: string;
  reason: string;
  requestedClockInAt?: string | null;
  requestedClockOutAt?: string | null;
  requestedClockInNote?: string | null;
  requestedClockOutNote?: string | null;
};

export type ReviewTimeEntryChangeRequest = {
  status: 'approved' | 'rejected';
  reviewNote?: string | null;
};

export type CreateRestaurantReservationRequest = {
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  partySize: number;
  reservationAt: string;
  durationMinutes: number;
  notes: string | null;
  tableIds: string[];
};

// ── Persistent order DTOs ──────────────────────────────────────────────────────

export type OrderStatusDto = 'open' | 'pending_payment' | 'paid' | 'cancelled';
export type OrderLineStatusDto = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type OrderPaymentMethodDto = 'cash' | 'card' | 'bizum' | 'other';
export type OrderPaymentStatusDto = 'pending' | 'completed' | 'failed' | 'refunded';

export type RestaurantOrderLineDto = {
  id: string;
  restaurantProductId: string | null;
  productId: string | null;
  productName: string;
  productType: 'simple' | 'combo' | 'platter';
  course: string;
  preparationRoute: string;
  basePriceCents: number;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  taxRateName: string | null;
  taxRatePercent: number | null;
  taxCents: number;
  status: OrderLineStatusDto;
  kitchenNote: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  configurationSignature: string;
  modifiers: Array<{ groupName: string; optionName: string; priceDeltaCents: number; quantity: number }>;
  comboSlots: Array<{ slotName: string; selectedProductName: string; supplementPriceCents: number; quantity: number }>;
  platterComponents: Array<{ componentName: string; removed: boolean; replacementName: string | null; priceDeltaCents: number }>;
};

export type RestaurantOrderPaymentDto = {
  id: string;
  method: OrderPaymentMethodDto;
  amountCents: number;
  status: OrderPaymentStatusDto;
  paidAt: string | null;
};

export type RestaurantOrderDto = {
  order: {
    id: string;
    restaurantId: string;
    tableId: string | null;
    status: OrderStatusDto;
    currency: string;
    guestCount: number;
    subtotalCents: number;
    taxCents: number;
    discountTotalCents: number;
    totalCents: number;
    paidCents: number;
    balanceCents: number;
    openedAt: string;
    updatedAt: string;
    closedAt: string | null;
  };
  lines: RestaurantOrderLineDto[];
  payments: RestaurantOrderPaymentDto[];
};

export type OpenRestaurantOrderRequest = {
  guestCount: number;
};

export type AddRestaurantOrderLineRequest = {
  restaurantProductId: string;
  quantity: number;
  kitchenNote: string | null;
  modifiers: Array<{ modifierGroupId: string; modifierOptionId: string; quantity: number }>;
  comboSlots: Array<{ comboSlotId: string; restaurantProductId: string; quantity: number }>;
  platterComponents: Array<{ platterComponentId: string; included: boolean }>;
};

export type UpdateRestaurantOrderLineRequest = {
  quantity?: number;
  kitchenNote?: string | null;
};

export type CancelRestaurantOrderLineRequest = {
  reason: string;
};

export type RegisterRestaurantOrderPaymentRequest = {
  amountCents: number;
  method: OrderPaymentMethodDto;
};

// ── Floor element DTOs ────────────────────────────────────────────────────────

export type CreateFloorElementRequest = {
  type: RestaurantElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tableId: string | null;
  shape: RestaurantElementShape | null;
  sortOrder: number;
};

export type UpdateFloorRequest = {
  name: string;
  rows: number;
  columns: number;
};

export type UpdateFloorElementRequest = {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: RestaurantElementShape | null;
  capacity: number | null;
};

export type ReorderFloorElementsRequest = {
  elements: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    sortOrder: number;
  }>;
};

export type RestaurantMenuModifierOptionDto = {
  id: string;
  name: string;
  priceDeltaCents: number;
  isAvailable: boolean;
};

export type RestaurantMenuModifierGroupDto = {
  id: string;
  name: string;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: RestaurantMenuModifierOptionDto[];
};

export type RestaurantMenuComboSlotOptionDto = {
  id: string;
  restaurantProductId: string;
  name: string;
  supplementPriceCents: number;
  isAvailable: boolean;
};

export type RestaurantMenuComboSlotDto = {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: RestaurantMenuComboSlotOptionDto[];
};

export type RestaurantMenuComboDefinitionDto = {
  id: string;
  slots: RestaurantMenuComboSlotDto[];
};

export type RestaurantMenuPlatterComponentDto = {
  id: string;
  name: string;
  removable: boolean;
  replaceable: boolean;
  sortOrder: number;
};

export type RestaurantMenuItemDto = {
  id: string;
  restaurantProductId?: string;
  productId?: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  productType: 'simple' | 'combo' | 'platter';
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  defaultCourse?: string;
  preparationRoute?: string;
  modifierGroups: RestaurantMenuModifierGroupDto[];
  comboDefinition: RestaurantMenuComboDefinitionDto | null;
  platterComponents: RestaurantMenuPlatterComponentDto[];
};

export type RestaurantMenuSectionDto = {
  id: string;
  name: string;
  sortOrder: number;
  isVisible: boolean;
  items: RestaurantMenuItemDto[];
};

export type RestaurantMenuDto = {
  id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
  sections: RestaurantMenuSectionDto[];
};

export type MenuSectionAdminDto = {
  id: string;
  menuId: string;
  name: string;
  sortOrder: number;
  isVisible: boolean;
};

export type MenuItemAdminDto = {
  id: string;
  sectionId: string;
  restaurantProductId: string;
  displayNameOverride: string | null;
  priceOverrideCents: number | null;
  sortOrder: number;
  isVisible: boolean;
};

export type RestaurantProductSummaryDto = {
  id: string;
  productId: string;
  name: string;
  displayName: string | null;
  imageUrl: string | null;
  modifierGroupIds: string[];
  productType: 'simple' | 'combo' | 'platter';
  course: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
  preparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  isVisible: boolean;
};

export type RestaurantProductDetailDto = {
  id: string;
  productId: string;
  organizationId: string;
  name: string;
  displayName: string | null;
  imageUrl: string | null;
  description: string | null;
  displayDescription: string | null;
  modifierGroupIds: string[];
  productType: 'simple' | 'combo' | 'platter';
  course: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
  preparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  preparationRouteOverride: string | null;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  isVisible: boolean;
};

export type CreateRestaurantProductRequest = {
  name: string;
  description?: string;
  imageUrl?: string | null;
  modifierGroupIds?: string[];
  priceCents: number;
  currency: string;
  course: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
  preparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
};

export type UpdateRestaurantProductRequest = {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  modifierGroupIds?: string[];
  priceCents?: number;
  course?: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
  preparationRoute?: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  isAvailable?: boolean;
  isVisible?: boolean;
};

export type CreateProductImageUploadSignatureRequest = {
  fileName?: string;
};

export type ProductImageUploadSignatureDto = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export type CreateMenuSectionRequest = { name: string; isVisible?: boolean };
export type UpdateMenuSectionRequest = { name?: string; isVisible?: boolean };
export type AddMenuSectionItemRequest = { restaurantProductId: string; displayNameOverride?: string; priceOverrideCents?: number };
export type UpdateMenuSectionItemRequest = { displayNameOverride?: string | null; priceOverrideCents?: number | null; isVisible?: boolean };
export type ReorderItemsRequest = { items: Array<{ id: string; sortOrder: number }> };

// ── Customers ────────────────────────────────────────────────────────────────

export type CustomerSummaryDto = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  visitCount: number;
  noShowCount: number;
  cancelCount: number;
  lateCount: number;
};

export type CreateCustomerRequest = {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

// ── Service Windows ──────────────────────────────────────────────────────────

export type ServiceWindowDto = {
  id: string;
  restaurantId: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
};

export type UpdateServiceWindowsRequest = {
  windows: Array<{ name: string; startTime: string; endTime: string }>;
};

// ── Modifier groups ───────────────────────────────────────────────────────────

export type CreateModifierGroupOptionRequest = {
  name: string;
  priceDeltaCents: number;
};

export type CreateModifierGroupRequest = {
  name: string;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: CreateModifierGroupOptionRequest[];
};
