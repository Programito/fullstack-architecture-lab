// Nombres multiidioma de la carta (ES/CA/EN), aditivos y opcionales junto al
// nombre canonico en castellano (`name`). El backend siempre devuelve las
// variantes que existan; la resolucion de que variante mostrar se hace
// siempre en el cliente, nunca aqui (protege la cache ETag/304 de
// GET /restaurants/:id/menu). Ver
// docs/superpowers/plans/2026-07-11-menu-multilingual-names.md.
export type NameI18n = {
  es?: string;
  ca?: string;
  en?: string;
};

export type RestaurantSummary = {
  id: string;
  organizationId: string;
  name: string;
  displayName: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
};

export type RestaurantMenuModifierOption = {
  id: string;
  name: string;
  nameI18n?: NameI18n;
  priceDeltaCents: number;
  isAvailable: boolean;
};

export type RestaurantMenuModifierGroup = {
  id: string;
  name: string;
  nameI18n?: NameI18n;
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
  nameI18n?: NameI18n;
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
  nameI18n?: NameI18n;
  removable: boolean;
  replaceable: boolean;
  sortOrder: number;
};

export type RestaurantMenuItem = {
  id: string;
  restaurantProductId?: string;
  productId?: string;
  name: string;
  nameI18n?: NameI18n;
  description?: string;
  descriptionI18n?: NameI18n;
  imageUrl: string | null;
  productType: 'simple' | 'combo' | 'platter';
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  // Visibilidad propia del item de sección (MenuItem.isVisible en Prisma), distinta de
  // `isAvailable` (que ya combina disponibilidad del producto + esta visibilidad para no
  // romper el filtrado existente en mobile). Opcional porque el dataset de demo en memoria
  // (demo-restaurant-read.repository.ts) no la declara en cada item; ausente == true (visible).
  // Se expone aparte para poder ofrecer en el admin un toggle "aparece en la app" que no se
  // confunda con el de disponibilidad ("agotado"). Ver docs/superpowers/plans/2026-07-13-menu-item-visibility-toggle.md.
  isVisible?: boolean;
  // Disponibilidad "cruda" del RestaurantProduct (RestaurantProduct.isAvailable en Prisma), sin
  // combinar con `isVisible`. Antes el admin solo tenia `isAvailable` (combinada), asi que el
  // toggle de "agotado" dejaba de reflejar cambios en cuanto `isVisible` era false: el
  // combinado se quedaba en false pase lo que pase con la disponibilidad real, y activar/
  // desactivar "agotado" parecia no hacer nada. Opcional por la misma razon que `isVisible`
  // (datasets de demo que no la declaran); ausente == usar `isAvailable` como antes.
  productAvailable?: boolean;
  defaultCourse?: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
  preparationRoute?: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  allergens?: Allergen[];
  modifierGroups?: RestaurantMenuModifierGroup[];
  comboDefinition?: RestaurantMenuComboDefinition | null;
  platterComponents?: RestaurantMenuPlatterComponent[];
};

export type RestaurantMenuSection = {
  id: string;
  name: string;
  nameI18n?: NameI18n;
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
  nameI18n?: NameI18n;
  displayName: string | null;
  imageUrl: string | null;
  modifierGroupIds: string[];
  productType: 'simple' | 'combo' | 'platter';
  course: ProductCourse;
  preparationRoute: PreparationRoute;
  allergens: Allergen[];
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  isVisible: boolean;
};

export type ProductCourse = 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
export type PreparationRoute = 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';

// Los 14 alergenos de declaracion obligatoria en la UE (Reglamento 1169/2011,
// anexo II) — mismo enum que Allergen en schema.prisma, como union literal
// para el dominio/DTOs (igual que ProductCourse/PreparationRoute).
export type Allergen =
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soybeans'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

export type RestaurantProductDetail = {
  id: string;
  productId: string;
  organizationId: string;
  name: string;
  nameI18n?: NameI18n;
  displayName: string | null;
  description: string | null;
  descriptionI18n?: NameI18n;
  displayDescription: string | null;
  imageUrl: string | null;
  modifierGroupIds: string[];
  productType: 'simple' | 'combo' | 'platter';
  course: ProductCourse;
  preparationRoute: PreparationRoute;
  preparationRouteOverride: PreparationRoute | null;
  allergens: Allergen[];
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  isVisible: boolean;
};

export type RestaurantMenuSectionView = {
  id: string;
  menuId: string;
  name: string;
  nameI18n?: NameI18n;
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

export type CustomerSummary = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  visitCount: number;
  noShowCount: number;
  cancelCount: number;
  lateCount: number;
};

export type Customer = CustomerSummary & {
  organizationId: string;
  notes: string | null;
};

export type CreateCustomerInput = {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};
