export const REALTIME_ORDER_EVENT_PUBLISHER = Symbol('REALTIME_ORDER_EVENT_PUBLISHER');

export type OrderRealtimeReason =
  | 'order.opened'
  | 'order.line.created'
  | 'order.line.updated'
  | 'order.line.deleted'
  | 'order.line.cancelled'
  | 'order.line.status-updated'
  | 'order.payment.recorded'
  | 'order.service-point.sent-to-kitchen'
  | 'order.service-point.marked-served'
  | 'order.service-point.charged'
  | 'order.service-point.freed';

export interface OrderInvalidatedEvent {
  restaurantId: string;
  tableId: string | null;
  orderId: string | null;
  reason: OrderRealtimeReason;
}

export interface RealtimeOrderEventPublisher {
  publishOrderInvalidated(event: OrderInvalidatedEvent): void;
}
