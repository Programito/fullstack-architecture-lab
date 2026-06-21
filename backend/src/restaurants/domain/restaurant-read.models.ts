export type RestaurantSummary = {
  id: string;
  name: string;
  displayName: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
};

export type RestaurantMenuItem = {
  id: string;
  name: string;
  productType: 'simple' | 'combo' | 'platter';
  priceCents: number;
  currency: string;
  isAvailable: boolean;
};

export type RestaurantMenuSection = {
  id: string;
  name: string;
  sortOrder: number;
  isVisible: boolean;
  items: RestaurantMenuItem[];
};

export type RestaurantMenu = {
  restaurantId: string;
  name: string;
  isActive: boolean;
  sections: RestaurantMenuSection[];
};

export type RestaurantTableView = {
  id: string;
  tableNumber: number;
  name: string | null;
  capacity: number;
  isActive: boolean;
};

export type FloorElementView = {
  id: string;
  type: 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tableId: string | null;
  shape: 'round' | 'square' | 'rectangle' | 'long' | null;
  sortOrder: number;
};

export type RestaurantFloorView = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  elements: FloorElementView[];
};

export type RestaurantFloors = {
  restaurantId: string;
  tables: RestaurantTableView[];
  floors: RestaurantFloorView[];
};

export type RestaurantReservation = {
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
};
