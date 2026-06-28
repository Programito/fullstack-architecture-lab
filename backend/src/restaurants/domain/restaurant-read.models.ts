export type RestaurantSummary = {
  id: string;
  name: string;
  displayName: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
};

export type RestaurantMenuModifierOption = {
  id: string;
  name: string;
  priceDeltaCents: number;
  isAvailable: boolean;
};

export type RestaurantMenuModifierGroup = {
  id: string;
  name: string;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: RestaurantMenuModifierOption[];
};

export type RestaurantMenuComboSlotOption = {
  id: string;
  restaurantProductId: string;
  name: string;
  supplementPriceCents: number;
  isAvailable: boolean;
};

export type RestaurantMenuComboSlot = {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: RestaurantMenuComboSlotOption[];
};

export type RestaurantMenuComboDefinition = {
  id: string;
  slots: RestaurantMenuComboSlot[];
};

export type RestaurantMenuPlatterComponent = {
  id: string;
  name: string;
  removable: boolean;
  replaceable: boolean;
  sortOrder: number;
};

export type RestaurantMenuItem = {
  id: string;
  restaurantProductId?: string;
  productId?: string;
  name: string;
  description?: string;
  productType: 'simple' | 'combo' | 'platter';
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  defaultCourse?: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
  preparationRoute?: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  modifierGroups?: RestaurantMenuModifierGroup[];
  comboDefinition?: RestaurantMenuComboDefinition | null;
  platterComponents?: RestaurantMenuPlatterComponent[];
};

export type RestaurantMenuSection = {
  id: string;
  name: string;
  sortOrder: number;
  isVisible: boolean;
  items: RestaurantMenuItem[];
};

export type RestaurantMenu = {
  id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
  sections: RestaurantMenuSection[];
};

export type RestaurantProductSummary = {
  id: string;
  productId: string;
  name: string;
  displayName: string | null;
  productType: 'simple' | 'combo' | 'platter';
  course: ProductCourse;
  preparationRoute: PreparationRoute;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  isVisible: boolean;
};

export type ProductCourse = 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
export type PreparationRoute = 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';

export type RestaurantProductDetail = {
  id: string;
  productId: string;
  organizationId: string;
  name: string;
  displayName: string | null;
  description: string | null;
  displayDescription: string | null;
  productType: 'simple' | 'combo' | 'platter';
  course: ProductCourse;
  preparationRoute: PreparationRoute;
  preparationRouteOverride: PreparationRoute | null;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  isVisible: boolean;
};

export type RestaurantMenuSectionView = {
  id: string;
  menuId: string;
  name: string;
  sortOrder: number;
  isVisible: boolean;
};

export type RestaurantMenuItemView = {
  id: string;
  sectionId: string;
  restaurantProductId: string;
  displayNameOverride: string | null;
  priceOverrideCents: number | null;
  sortOrder: number;
  isVisible: boolean;
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
  tables: Array<{
    id: string;
    tableNumber: number;
    name: string | null;
  }>;
};

export type CreateRestaurantReservationInput = {
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  partySize: number;
  reservationAt: string;
  durationMinutes: number;
  notes: string | null;
  tableIds: string[];
};

export type ServiceWindow = {
  id: string;
  restaurantId: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
};

export type UpdateServiceWindowInput = {
  name: string;
  startTime: string;
  endTime: string;
};
