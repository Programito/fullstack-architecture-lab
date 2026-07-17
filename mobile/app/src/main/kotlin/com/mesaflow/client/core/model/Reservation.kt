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
) {
    /** true si la reserva ya no ocupa mesa (cancelada o no-show): puede dejar de mostrarse. */
    val isClosed: Boolean
        get() = status == ReservationStatus.CANCELLED || status == ReservationStatus.NO_SHOW

    /**
     * true si la reserva es de un día ya pasado (ayer o antes) respecto a la
     * medianoche UTC de hoy — el mismo criterio de día UTC que usa el
     * DatePicker del formulario (ver ReservationDateRules). Una fecha que no
     * se puede parsear cuenta como no-pasada: mejor mostrar una reserva rara
     * que borrar una válida por un formato inesperado.
     */
    fun isFromPastDay(todayStartUtcMillis: Long): Boolean =
        runCatching { java.time.Instant.parse(reservationAt).toEpochMilli() < todayStartUtcMillis }
            .getOrDefault(false)
}

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
 * Referencia mínima a una reserva propia, persistida en [com.mesaflow.client.core.datastore.ReservationStore].
 * No hay listado de reservas para el cliente (ver ReservationsApi), así que
 * estas referencias son la única forma de volver a encontrarlas tras cerrar la app.
 */
data class OwnReservationRef(
    val restaurantId: String,
    val reservationId: String,
)
