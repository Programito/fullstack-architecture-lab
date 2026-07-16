import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

import type {
  ReservationPaymentChargeInput,
  ReservationPaymentGateway,
  ReservationPaymentResult,
} from '../application/ports/reservation-payment-gateway.port';

/**
 * Pasarela de pago fake para la fianza de reservas: nunca contacta ningun
 * banco ni pasarela real, igual que el cobro de pedidos en TPV (ver
 * RegisterRestaurantOrderPaymentUseCase / "checkout_mock_note" en la app
 * cliente) — cualquier método siempre se aprueba. El puerto sigue
 * devolviendo `approved` como resultado explícito (en vez de asumir éxito
 * siempre desde el caso de uso) para que sustituir este fake por una
 * pasarela real en el futuro sea un cambio de adaptador, no de
 * CreateRestaurantReservationUseCase.
 */
@Injectable()
export class FakeReservationPaymentGateway implements ReservationPaymentGateway {
  async charge(_input: ReservationPaymentChargeInput): Promise<ReservationPaymentResult> {
    return { approved: true, paymentReference: `fake-pay-${randomUUID()}` };
  }
}
