import type { PaymentMethod } from './payment.models';
import type { ProductCourse, ProductPreparationPolicy, ProductType } from '../../menu/models/menu.models';

export type OrderCourse = ProductCourse;

export type SelectedModifierSnapshotType = 'single' | 'multiple' | 'remove';

export interface SelectedModifierSnapshot {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  priceDelta: number;
  type: SelectedModifierSnapshotType;
}

export interface PlatterComponentSnapshot {
  id: string;
  name: string;
  productId?: string;
  quantity?: number;
  removable: boolean;
  replaceable: boolean;
}

export interface OrderLineProductSnapshot {
  productId: string;
  productName: string;
  productType: ProductType;
  basePrice: number;
  course: OrderCourse;
  preparationPolicy: ProductPreparationPolicy;
}

export interface SelectedComboSlotProductSnapshot {
  productId: string;
  productName: string;
  productType: ProductType;
  course: OrderCourse;
  preparationPolicy: ProductPreparationPolicy;
  supplementPrice: number;
}

export interface SelectedComboSlotSnapshot {
  slotId: string;
  slotName: string;
  selectedProducts: SelectedComboSlotProductSnapshot[];
}

export interface OrderLine {
  id: string;
  productSnapshot: OrderLineProductSnapshot;
  productId: string;
  productName: string;
  quantity: number;
  basePrice: number;
  selectedModifiers: SelectedModifierSnapshot[];
  kitchenNote?: string;
  unitPrice: number;
  subtotal: number;
  configurationSignature: string;
  course: OrderCourse;
  status: OrderLineStatus;
  selectedComboSlots?: SelectedComboSlotSnapshot[];
  platterComponents?: PlatterComponentSnapshot[];
  note?: string;
  sentToKitchenAt?: string;
  preparingAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  servedAt?: string;
}

export type OrderStatus = 'open' | 'sent_to_kitchen' | 'served' | 'payment_pending' | 'paid';
export type OrderLineStatus = 'pending' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'picked_up' | 'served' | 'cancelled';

export interface TableOrder {
  id?: string;
  tableId: string;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
}

export type OrdersByTable = Record<string, TableOrder>;
