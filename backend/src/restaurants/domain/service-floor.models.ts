export type ServiceTableStatus = 'free' | 'occupied' | 'waiting_kitchen' | 'served' | 'payment_pending' | 'paid' | 'cleaning' | 'reserved';

export type ServiceOrderStatus = 'open' | 'sent_to_kitchen' | 'served' | 'payment_pending' | 'paid';

export type ServiceOrderLineStatus = 'pending' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'picked_up' | 'served' | 'cancelled';

export type ServicePhaseCourse = 'drinks' | 'starters' | 'mains' | 'desserts' | 'mixed' | 'none';

export type ServicePhaseStatus = 'no_order' | 'pending' | 'in_progress' | 'ready' | 'served';

export type ServicePointSummaryView = {
  lineCount: number;
  guestCount: number;
  totalCents: number;
  currency: string;
  servicePhase: {
    course: ServicePhaseCourse;
    status: ServicePhaseStatus;
  };
};

export type ServiceFloorView = {
  restaurantId: string;
  floor: {
    id: string;
    name: string;
    rows: number;
    columns: number;
  };
  elements: Array<{
    id: string;
    type: 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'round' | 'square' | 'rectangle' | 'long' | null;
    tableId: string | null;
  }>;
  servicePoints: Array<{
    table: {
      id: string;
      tableNumber: number;
      name: string | null;
      capacity: number;
      status: ServiceTableStatus;
      serviceStartedAt: string | null;
    };
    summary: ServicePointSummaryView;
  }>;
  totals: {
    servicePointCount: number;
    occupiedCount: number;
    openOrderCount: number;
  };
};

export type ServicePointDetailView = {
  table: {
    id: string;
    tableNumber: number;
    name: string | null;
    capacity: number;
    status: ServiceTableStatus;
    occupiedAt: string | null;
    serviceStartedAt: string | null;
  };
  floorElement: {
    id: string;
    label: string;
    type: 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'round' | 'square' | 'rectangle' | 'long' | null;
  } | null;
  serviceInfo: ServicePointSummaryView & {
    durationMinutes: number;
  };
};

export type ServicePointOrderView = {
  order: {
    id: string;
    tableId: string;
    status: ServiceOrderStatus;
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
    status: ServiceOrderLineStatus;
    course: ServicePhaseCourse;
    kitchenNote: string | null;
  }>;
};
