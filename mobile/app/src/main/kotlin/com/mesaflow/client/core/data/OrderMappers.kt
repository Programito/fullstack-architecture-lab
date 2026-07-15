package com.mesaflow.client.core.data

import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.OrderLineKitchenStatus
import com.mesaflow.client.core.model.ServicePointOrderLine
import com.mesaflow.client.core.model.ServicePointOrderStatus
import com.mesaflow.client.core.network.dto.AddOrderLineRequestDto
import com.mesaflow.client.core.network.dto.OrderLineComboSlotRequestDto
import com.mesaflow.client.core.network.dto.OrderLineModifierRequestDto
import com.mesaflow.client.core.network.dto.OrderLinePlatterComponentRequestDto
import com.mesaflow.client.core.network.dto.ServicePointOrderLineDto
import com.mesaflow.client.core.network.dto.ServicePointOrderResponseDto

/**
 * Traduce una línea de carrito al contrato del backend. Devuelve null si el
 * producto no tiene restaurantProductId (no se puede pedir): el repositorio
 * lo convierte en error de validación en vez de enviar un pedido a medias.
 * Los ingredientes quitados viajan como included=false; los no tocados no se
 * envían (el backend los asume incluidos).
 */
fun CartLine.toAddLineRequest(): AddOrderLineRequestDto? {
    val productId = restaurantProductId ?: return null
    return AddOrderLineRequestDto(
        restaurantProductId = productId,
        quantity = quantity,
        modifiers = selections.modifiers.map {
            OrderLineModifierRequestDto(
                modifierGroupId = it.groupId,
                modifierOptionId = it.optionId,
                quantity = 1,
            )
        },
        comboSlots = selections.comboOptions.map {
            OrderLineComboSlotRequestDto(
                comboSlotId = it.slotId,
                restaurantProductId = it.restaurantProductId,
                quantity = 1,
            )
        },
        platterComponents = selections.removedComponents.map {
            OrderLinePlatterComponentRequestDto(
                platterComponentId = it.componentId,
                included = false,
            )
        },
    )
}

/** Traduce la respuesta de `GET .../service-points/{tableId}/order` al modelo de dominio. */
fun ServicePointOrderResponseDto.toServicePointOrderStatus(): ServicePointOrderStatus = ServicePointOrderStatus(
    orderId = order?.id,
    status = order?.status,
    totalCents = order?.totalCents ?: 0L,
    currency = order?.currency ?: "EUR",
    lines = lines.map { it.toServicePointOrderLine() },
)

private fun ServicePointOrderLineDto.toServicePointOrderLine(): ServicePointOrderLine = ServicePointOrderLine(
    id = id,
    productName = productName,
    quantity = quantity,
    status = status.toKitchenStatusOrUnknown(),
)

private fun String.toKitchenStatusOrUnknown(): OrderLineKitchenStatus = when (this) {
    "pending" -> OrderLineKitchenStatus.PENDING
    "sent_to_kitchen" -> OrderLineKitchenStatus.SENT_TO_KITCHEN
    "preparing" -> OrderLineKitchenStatus.PREPARING
    "ready" -> OrderLineKitchenStatus.READY
    "picked_up" -> OrderLineKitchenStatus.PICKED_UP
    "served" -> OrderLineKitchenStatus.SERVED
    "cancelled" -> OrderLineKitchenStatus.CANCELLED
    else -> OrderLineKitchenStatus.UNKNOWN
}
