import type { PaymentMethod } from './payment.models';

export interface OrderLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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
