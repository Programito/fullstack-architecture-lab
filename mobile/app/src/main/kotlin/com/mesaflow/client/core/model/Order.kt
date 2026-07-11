package com.mesaflow.client.core.model

/** Resultado de enviar el carrito: lo mínimo que necesitan resumen y cobro (Fase 7). */
data class SubmittedOrder(
    val orderId: String,
    val status: String,
    /** Número de ticket visible al cliente: contador diario por restaurante. */
    val dailyNumber: Int,
    val totalCents: Long,
    val currency: String,
)

/** Método de pago aceptado por el backend. */
enum class PaymentMethod(val apiValue: String) {
    CARD("card"),
    CASH("cash"),
    BIZUM("bizum"),
}

/** Resultado de registrar el pago del pedido. */
data class PaymentResult(
    val orderId: String,
    val status: String,
    /** Número de ticket visible al cliente: contador diario por restaurante. */
    val dailyNumber: Int,
    val paidCents: Long,
    val balanceCents: Long,
    val currency: String,
)

/**
 * Estado por línea del pedido activo de una mesa, tal cual lo expone
 * `GET /restaurants/:id/service-points/:tableId/order` (mismo endpoint que
 * usa el panel de cocina/sala — ver `RestaurantFloorController`). UNKNOWN
 * cubre valores que el backend pueda enviar y esta version de la app no
 * reconozca todavia, mismo criterio que con `Allergen`: se muestra como
 * "actualizando" en vez de ocultarse en silencio.
 */
enum class OrderLineKitchenStatus {
    PENDING,
    SENT_TO_KITCHEN,
    PREPARING,
    READY,
    PICKED_UP,
    SERVED,
    CANCELLED,
    UNKNOWN,
}

data class ServicePointOrderLine(
    val id: String,
    val productName: String,
    val quantity: Int,
    val status: OrderLineKitchenStatus,
)

/**
 * Estado del pedido activo de la mesa del cliente. `orderId`/`status` son
 * null si la mesa no tiene ningun pedido abierto (p.ej. ya se pago y se
 * libero, o el sondeo arranca antes de que el pedido exista todavia).
 */
data class ServicePointOrderStatus(
    val orderId: String?,
    val status: String?,
    val lines: List<ServicePointOrderLine>,
)
