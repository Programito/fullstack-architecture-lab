package com.mesaflow.client.core.data

import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.common.map
import com.mesaflow.client.core.common.safeApiCall
import com.mesaflow.client.core.datastore.ReservationStore
import com.mesaflow.client.core.model.OwnReservationRef
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.Reservation
import com.mesaflow.client.core.model.ReservationStatus
import com.mesaflow.client.core.network.ReservationsApi
import com.mesaflow.client.core.network.dto.CreateReservationRequestDto
import com.mesaflow.client.core.network.dto.ReservationResponseDto
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Reservas propias del cliente final. Deliberadamente no expone el listado
 * del restaurante: el rol `customer` del demo-login no tiene el permiso
 * `reservations` que exige `GET restaurants/{id}/reservations` en el backend
 * (ver RestaurantReservationsController), así que esta app solo puede crear
 * reservas y luego consultarlas/cancelarlas por los ids que ella misma guardó
 * al crearlas (ver [ReservationStore]) — nunca ve las reservas de otros
 * clientes.
 */
@Singleton
class ReservationRepository @Inject constructor(
    private val reservationsApi: ReservationsApi,
    private val reservationStore: ReservationStore,
) {

    suspend fun currentOwnReservations(): List<OwnReservationRef> = reservationStore.currentOwnReservations()

    suspend fun create(
        restaurantId: String,
        customerName: String,
        customerPhone: String?,
        partySize: Int,
        reservationAt: String,
        paymentMethod: PaymentMethod,
        durationMinutes: Int? = null,
        notes: String? = null,
    ): AppResult<Reservation> {
        val result = safeApiCall {
            reservationsApi.createReservation(
                restaurantId = restaurantId,
                body = CreateReservationRequestDto(
                    customerNameSnapshot = customerName,
                    customerPhoneSnapshot = customerPhone,
                    partySize = partySize,
                    reservationAt = reservationAt,
                    durationMinutes = durationMinutes,
                    notes = notes,
                    paymentMethod = paymentMethod.apiValue,
                ),
            )
        }.map { it.toReservation(restaurantId) }

        if (result is AppResult.Success) {
            reservationStore.addOwnReservation(
                OwnReservationRef(restaurantId = restaurantId, reservationId = result.data.id),
            )
        }
        return result
    }

    /**
     * Refresca todas las reservas propias guardadas; null si el cliente no
     * tiene ninguna. Las que ya están cerradas (canceladas desde el panel de
     * Angular, no-show), las de un día ya pasado y las que ya no existen en
     * el backend se eliminan del almacén local y no se devuelven: dejaron de
     * ser "mis reservas activas". Cualquier otro error (red, sesión) se
     * propaga sin tocar el almacén.
     *
     * [todayStartUtcMillis] es la medianoche UTC de hoy (mismo criterio de
     * día que el DatePicker del formulario); es un parámetro para poder
     * testear "hoy" de forma determinista.
     */
    suspend fun refreshOwnReservations(
        todayStartUtcMillis: Long = defaultTodayStartUtcMillis(),
    ): AppResult<List<Reservation>>? {
        val refs = reservationStore.currentOwnReservations()
        if (refs.isEmpty()) return null

        val active = mutableListOf<Reservation>()
        for (ref in refs) {
            val result = safeApiCall { reservationsApi.getReservation(ref.restaurantId, ref.reservationId) }
                .map { it.toReservation(ref.restaurantId) }
            when (result) {
                is AppResult.Success ->
                    if (result.data.isClosed || result.data.isFromPastDay(todayStartUtcMillis)) {
                        reservationStore.removeOwnReservation(ref)
                    } else {
                        active += result.data
                    }
                is AppResult.Error ->
                    if (result.error == AppError.NotFound) {
                        reservationStore.removeOwnReservation(ref)
                    } else {
                        return AppResult.Error(result.error)
                    }
            }
        }
        return AppResult.Success(active)
    }

    /** Cancela una reserva propia concreta y, si el backend acepta, olvida su referencia. */
    suspend fun cancelOwnReservation(ref: OwnReservationRef): AppResult<Reservation> {
        val result = safeApiCall { reservationsApi.cancelReservation(ref.restaurantId, ref.reservationId) }
            .map { it.toReservation(ref.restaurantId) }
        if (result is AppResult.Success) {
            reservationStore.removeOwnReservation(ref)
        }
        return result
    }
}

/** Medianoche UTC del día actual (espejo de todayUtcMillis en ReservationDateRules). */
private fun defaultTodayStartUtcMillis(): Long =
    java.time.Instant.now()
        .atZone(java.time.ZoneOffset.UTC)
        .toLocalDate()
        .atStartOfDay(java.time.ZoneOffset.UTC)
        .toInstant()
        .toEpochMilli()

private fun ReservationResponseDto.toReservation(restaurantId: String): Reservation =
    Reservation(
        id = id,
        restaurantId = restaurantId,
        customerName = customerNameSnapshot,
        customerPhone = customerPhoneSnapshot,
        partySize = partySize,
        reservationAt = reservationAt,
        durationMinutes = durationMinutes,
        status = status.toReservationStatus(),
        notes = notes,
        depositAmountCents = depositAmountCents,
        depositPaidAt = depositPaidAt,
    )

private fun String.toReservationStatus(): ReservationStatus = when (this) {
    "pending" -> ReservationStatus.PENDING
    "confirmed" -> ReservationStatus.CONFIRMED
    "seated" -> ReservationStatus.SEATED
    "cancelled" -> ReservationStatus.CANCELLED
    "no_show" -> ReservationStatus.NO_SHOW
    else -> ReservationStatus.UNKNOWN
}
