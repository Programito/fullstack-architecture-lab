package com.mesaflow.client.core.model

/** Resultado de enviar el carrito: lo mínimo que necesitan resumen y cobro (Fase 7). */
data class SubmittedOrder(
    val orderId: String,
    val status: String,
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
    val paidCents: Long,
    val balanceCents: Long,
    val currency: String,
)
