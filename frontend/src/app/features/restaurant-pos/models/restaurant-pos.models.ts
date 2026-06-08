export type FloorElementType = 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';
export type EditableFloorElementType = Extract<FloorElementType, 'table' | 'bar' | 'kitchen'>;
export type TableShape = 'round' | 'square' | 'rectangle' | 'long';

export interface FloorElement {
  id: string;
  type: FloorElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tableId?: string;
  shape?: TableShape;
}

export type AddFloorElementInput = Omit<FloorElement, 'id' | 'tableId'> & {
  tableId?: string;
};

export type TableStatus = 'free' | 'occupied' | 'waiting_kitchen' | 'served' | 'payment_pending' | 'paid' | 'cleaning' | 'reserved';

export interface RestaurantTable {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  total: number;
  openDuration: string;
  occupiedAt?: string;
  serviceStartedAt?: string;
  cleaningStartedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  allergens?: string[];
}

export interface OrderLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  course: OrderCourse;
  status: OrderLineStatus;
  sentToKitchenAt?: string;
  servedAt?: string;
}

export type OrderStatus = 'open' | 'sent_to_kitchen' | 'served' | 'payment_pending' | 'paid';
export type OrderCourse = 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
export type OrderLineStatus = 'pending' | 'sent_to_kitchen' | 'served';

export type PaymentMethod = 'cash' | 'card' | 'bizum' | 'pending';

export interface TableOrder {
  tableId: string;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
}

export type PosMode = 'operation' | 'edit_layout';

export type OrdersByTable = Record<string, TableOrder>;
