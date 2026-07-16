package com.mesaflow.client.core.network.dto

import kotlinx.serialization.Serializable

/**
 * Contrato de reservas del backend (RestaurantReservationsController), solo
 * los endpoints que el rol `customer` del demo-login puede usar:
 * - POST   restaurants/{id}/reservations                  -> crea la reserva propia
 * - GET    restaurants/{id}/reservations/{reservationId}   -> consulta por id conocido
 * - PATCH  restaurants/{id}/reservations/{reservationId}/cancel -> cancela por id conocido
 * Deliberadamente no hay DTO de listado: ese endpoint exige el permiso
 * `reservations`, que el rol `customer` no tiene.
 */
@Serializable
data class CreateReservationRequestDto(
    val customerNameSnapshot: String,
    val customerPhoneSnapshot: String? = null,
    val partySize: Int,
    val reservationAt: String,
    val durationMinutes: Int? = null,
    val notes: String? = null,
    // Metodo elegido para pagar la fianza (mismo selector que al pagar un
    // pedido, ver PaymentMethod.apiValue): "card" | "cash" | "bizum". El
    // cobro real siempre es fake (ver FakeReservationPaymentGateway en el
    // backend), igual que el pago de un pedido.
    val paymentMethod: String,
)

@Serializable
data class ReservationResponseDto(
    val id: String,
    val customerNameSnapshot: String,
    val customerPhoneSnapshot: String? = null,
    val partySize: Int,
    val reservationAt: String,
    val durationMinutes: Int,
    val status: String,
    val notes: String? = null,
    val depositAmountCents: Int = 0,
    val depositPaidAt: String? = null,
)
