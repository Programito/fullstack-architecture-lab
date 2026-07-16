package com.mesaflow.client.core.network

import com.mesaflow.client.core.network.dto.CreateReservationRequestDto
import com.mesaflow.client.core.network.dto.ReservationResponseDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Solo los tres endpoints que el rol `customer` del demo-login puede usar
 * (ver ReservationDtos). Deliberadamente no hay `listReservations`: el
 * listado completo de RestaurantReservationsController exige el permiso
 * `reservations`, que este rol no tiene, y no tiene sentido que la app
 * cliente sepa de otras reservas del restaurante.
 */
interface ReservationsApi {

    @POST("restaurants/{restaurantId}/reservations")
    suspend fun createReservation(
        @Path("restaurantId") restaurantId: String,
        @Body body: CreateReservationRequestDto,
    ): ReservationResponseDto

    @GET("restaurants/{restaurantId}/reservations/{reservationId}")
    suspend fun getReservation(
        @Path("restaurantId") restaurantId: String,
        @Path("reservationId") reservationId: String,
    ): ReservationResponseDto

    @PATCH("restaurants/{restaurantId}/reservations/{reservationId}/cancel")
    suspend fun cancelReservation(
        @Path("restaurantId") restaurantId: String,
        @Path("reservationId") reservationId: String,
    ): ReservationResponseDto
}
