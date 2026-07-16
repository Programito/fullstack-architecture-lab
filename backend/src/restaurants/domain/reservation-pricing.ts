// Fianza (fake, no hay cobro real) para reservar mesa: un importe fijo por
// comensal, para desincentivar reservas fantasma sin implicar un pasarela de
// pago real. Ver FakeReservationPaymentGateway (infra) y
// CreateRestaurantReservationUseCase (aplica el cobro antes de crear la
// reserva).
export const RESERVATION_DEPOSIT_PER_PERSON_CENTS = 500;

export function calculateReservationDepositCents(partySize: number): number {
  return partySize * RESERVATION_DEPOSIT_PER_PERSON_CENTS;
}
