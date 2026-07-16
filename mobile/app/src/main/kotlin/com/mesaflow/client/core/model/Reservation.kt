package com.mesaflow.client.core.model

/** Reserva propia del cliente (creada, consultada o cancelada desde esta app). */
data class Reservation(
    val id: String,
    val restaurantId: String,
    val customerName: String,
    val customerPhone: String?,
    val partySize: Int,
    val reservationAt: String,
    val durationMinutes: Int,
    val status: ReservationStatus,
    val notes: String?,
    // Fianza fake cobrada al crear la reserva (ver ReservationPricing y
    // FakeReservationPaymentGateway en el backend): nunca hay un cobro
    // real, pero se muestra el importe y el momento en que el pago fake
    // fue aprobado.
    val depositAmountCents: Int,
    val depositPaidAt: String?,
)

/**
 * Espejo del campo `status` del backend. `UNKNOWN` es la reserva de un valor
 * no reconocido (mismo patrón que [OrderLineKitchenStatus]/[PlatformStatus]):
 * se muestra como estado neutro en vez de ocultarse o hacer crash la app.
 */
enum class ReservationStatus {
    PENDING,
    CONFIRMED,
    SEATED,
    CANCELLED,
    NO_SHOW,
    UNKNOWN,
}

/**
 * Referencia mínima a la reserva propia, persistida en [com.mesaflow.client.core.datastore.ReservationStore].
 * No hay listado de reservas para el cliente (ver ReservationsApi), así que
 * esta referencia es la única forma de volver a encontrarla tras cerrar la app.
 */
data class OwnReservationRef(
    val restaurantId: String,
    val reservationId: String,
)
