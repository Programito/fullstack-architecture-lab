package com.mesaflow.client.core.network.dto

import kotlinx.serialization.Serializable

/**
 * Contrato de pedidos del backend (RestaurantOrderController):
 * - POST restaurants/{id}/service-points/{tableId}/orders  -> abre (o devuelve) el pedido activo de la mesa
 * - POST restaurants/{id}/orders/{orderId}/lines           -> añade una línea configurada
 * De la respuesta solo modelamos lo que la app consume; el Json global
 * ignora el resto de campos.
 */
@Serializable
data class OpenOrderRequestDto(
    val guestCount: Int? = null,
)

@Serializable
data class OrderLineModifierRequestDto(
    val modifierGroupId: String,
    val modifierOptionId: String,
    val quantity: Int = 1,
)

@Serializable
data class OrderLineComboSlotRequestDto(
    val comboSlotId: String,
    val restaurantProductId: String,
    val quantity: Int = 1,
)

@Serializable
data class OrderLinePlatterComponentRequestDto(
    val platterComponentId: String,
    val included: Boolean,
)

@Serializable
data class AddOrderLineRequestDto(
    val restaurantProductId: String,
    val quantity: Int,
    val kitchenNote: String? = null,
    val modifiers: List<OrderLineModifierRequestDto> = emptyList(),
    val comboSlots: List<OrderLineComboSlotRequestDto> = emptyList(),
    val platterComponents: List<OrderLinePlatterComponentRequestDto> = emptyList(),
)

@Serializable
data class RegisterPaymentRequestDto(
    val amountCents: Long,
    /** Valores aceptados por el backend: cash, card, bizum, other. */
    val method: String,
)

@Serializable
data class OrderSummaryDto(
    val id: String,
    val restaurantId: String,
    val tableId: String? = null,
    val status: String,
    val currency: String = "EUR",
    val subtotalCents: Long = 0,
    val taxCents: Long = 0,
    val totalCents: Long = 0,
    val paidCents: Long = 0,
    val balanceCents: Long = 0,
)

@Serializable
data class OrderResponseDto(
    val order: OrderSummaryDto,
)
