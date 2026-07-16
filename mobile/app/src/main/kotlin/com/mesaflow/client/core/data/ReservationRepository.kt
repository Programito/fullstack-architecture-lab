package com.mesaflow.client.core.data

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
 * Reserva propia del cliente final. Deliberadamente no expone un listado:
 * el rol `customer` del demo-login no tiene el permiso `reservations` que
 * exige `GET restaurants/{id}/reservations` en el backend (ver
 * RestaurantReservationsController), así que esta app solo puede crear una
 * reserva y luego consultarla/cancelarla por el id que ella misma guardó
 * al crearla (ver [ReservationStore]) — nunca ve las reservas de otros
 * clientes.
 */
@Singleton
class ReservationRepository @Inject constructor(
    private val reservationsApi: ReservationsApi,
    private val reservationStore: ReservationStore,
) {

    suspend fun currentOwnReservation(): OwnReservationRef? = reservationStore.currentOwnReservation()

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
            reservationStore.saveOwnReservation(
                OwnReservationRef(restaurantId = restaurantId, reservationId = result.data.id),
            )
        }
        return result
    }

    /** Refresca la reserva propia si hay alguna guardada; null si el cliente no tiene ninguna. */
    suspend fun refreshOwnReservation(): AppResult<Reservation>? {
        val ref = reservationStore.currentOwnReservation() ?: return null
        return safeApiCall { reservationsApi.getReservation(ref.restaurantId, ref.reservationId) }
            .map { it.toReservation(ref.restaurantId) }
    }

    /** Cancela la reserva propia guardada; null si no hay ninguna que cancelar. */
    suspend fun cancelOwnReservation(): AppResult<Reservation>? {
        val ref = reservationStore.currentOwnReservation() ?: return null
        val result = safeApiCall { reservationsApi.cancelReservation(ref.restaurantId, ref.reservationId) }
            .map { it.toReservation(ref.restaurantId) }
        if (result is AppResult.Success) {
            reservationStore.clearOwnReservation()
        }
        return result
    }
}

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
