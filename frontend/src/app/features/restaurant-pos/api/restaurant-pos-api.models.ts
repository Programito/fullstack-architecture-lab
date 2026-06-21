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
