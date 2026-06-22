export type RestaurantElementType = 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';

export type RestaurantElementShape = 'round' | 'square' | 'rectangle' | 'long';

export type RestaurantSummaryDto = {
  id: string;
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
  lines: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
    status: ServiceOrderLineStatusDto;
    course: ServicePhaseCourseDto;
    kitchenNote: string | null;
  }>;
};

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
