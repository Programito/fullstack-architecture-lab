package com.mesaflow.client.core.network

import com.mesaflow.client.core.network.dto.AddOrderLineRequestDto
import com.mesaflow.client.core.network.dto.OpenOrderRequestDto
import com.mesaflow.client.core.network.dto.OrderResponseDto
import com.mesaflow.client.core.network.dto.RegisterPaymentRequestDto
import com.mesaflow.client.core.network.dto.ServicePointOrderResponseDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface OrdersApi {

    /** Abre el pedido de la mesa; si ya hay uno activo, el backend lo devuelve (200). */
    @POST("restaurants/{restaurantId}/service-points/{tableId}/orders")
    suspend fun openOrder(
        @Path("restaurantId") restaurantId: String,
        @Path("tableId") tableId: String,
        @Body body: OpenOrderRequestDto,
    ): OrderResponseDto

    @POST("restaurants/{restaurantId}/orders/{orderId}/lines")
    suspend fun addLine(
        @Path("restaurantId") restaurantId: String,
        @Path("orderId") orderId: String,
        @Body body: AddOrderLineRequestDto,
    ): OrderResponseDto

    /**
     * Dispara las líneas pendientes a cocina (las pone en preparación). Sin
     * esta llamada el pedido existe pero el panel de cocina no lo ve.
     * La respuesta (detalle del punto de servicio) no nos interesa aquí.
     */
    @POST("restaurants/{restaurantId}/service-points/{tableId}/send-to-kitchen")
    suspend fun sendToKitchen(
        @Path("restaurantId") restaurantId: String,
        @Path("tableId") tableId: String,
    )

    @POST("restaurants/{restaurantId}/orders/{orderId}/payments")
    suspend fun registerPayment(
        @Path("restaurantId") restaurantId: String,
        @Path("orderId") orderId: String,
        @Body body: RegisterPaymentRequestDto,
    ): OrderResponseDto

    /**
     * Estado del pedido activo de la mesa, con el estado de cada línea en
     * cocina (pending/sent_to_kitchen/preparing/ready/picked_up/served).
     * Mismo endpoint que usa el panel de sala/cocina
     * (`RestaurantFloorController.servicePointOrder`); no exige permisos
     * adicionales sobre los que ya tiene el rol `customer` del demo-login.
     */
    @GET("restaurants/{restaurantId}/service-points/{tableId}/order")
    suspend fun getServicePointOrder(
        @Path("restaurantId") restaurantId: String,
        @Path("tableId") tableId: String,
    ): ServicePointOrderResponseDto
}
