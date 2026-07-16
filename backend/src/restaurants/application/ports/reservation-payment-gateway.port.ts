import type { PaymentMethod } from '../../domain/restaurant-order.models';

export const RESERVATION_PAYMENT_GATEWAY = Symbol('RESERVATION_PAYMENT_GATEWAY');

export type ReservationPaymentChargeInput = {
  amountCents: number;
  method: PaymentMethod;
};

export type ReservationPaymentResult = {
  approved: boolean;
  paymentReference: string | null;
};

/**
 * Cobro de la fianza de una reserva. Puerto deliberadamente mínimo (un solo
 * método, "charge") porque la única implementación actual es fake (ver
 * FakeReservationPaymentGateway) — no hay integración con ninguna pasarela
 * de pago real, igual que RegisterRestaurantOrderPaymentUseCase para el
 * cobro del pedido. Reutiliza el mismo `PaymentMethod` ('cash' | 'card' |
 * 'bizum' | 'other') que ese flujo en veh de un número de tarjeta: el
 * cliente elige método con el mismo selector que al pagar un pedido, no
 * escribe ningún dato de tarjeta.
 */
export interface ReservationPaymentGateway {
  charge(input: ReservationPaymentChargeInput): Promise<ReservationPaymentResult>;
}
