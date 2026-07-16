package com.mesaflow.client.feature.reservation

/**
 * Espejo del calculo de fianza del backend (ver reservation-pricing.ts,
 * usado por CreateRestaurantReservationUseCase): un importe fijo por
 * comensal. Se duplica aqui solo para poder mostrar el precio en la UI
 * antes de enviar la reserva; el backend es quien realmente calcula y
 * cobra el importe final, así que un desajuste aquí nunca permite pagar
 * de menos, solo mostraría un precio incorrecto en pantalla (cubierto por
 * ReservationPricingTest).
 */
const val RESERVATION_DEPOSIT_PER_PERSON_CENTS = 500

fun calculateReservationDepositCents(partySize: Int): Int = partySize * RESERVATION_DEPOSIT_PER_PERSON_CENTS
