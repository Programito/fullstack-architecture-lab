import type { PaymentMethod } from './payment.models';
import type { SelectedModifier } from '../../menu/models/menu.models';

export interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  basePrice: number;
  selectedModifiers: SelectedModifier[];
  kitchenNote?: string;
  unitPrice: number;
  subtotal: number;
  configurationSignature: string;
  course: OrderCourse;
  status: OrderLineStatus;
  note?: string;
  sentToKitchenAt?: string;
  preparingAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  servedAt?: string;
}

export type OrderStatus = 'open' | 'sent_to_kitchen' | 'served' | 'payment_pending' | 'paid';
export type OrderCourse = 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
export type OrderLineStatus = 'pending' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'picked_up' | 'served';

export interface TableOrder {
  tableId: string;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
}

export type OrdersByTable = Record<string, TableOrder>;
