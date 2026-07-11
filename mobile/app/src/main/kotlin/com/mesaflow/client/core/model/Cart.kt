package com.mesaflow.client.core.model

import kotlinx.serialization.Serializable

/**
 * Línea del carrito: un producto configurado (extras, combo, ingredientes
 * quitados) con su cantidad. Las selecciones son @Serializable porque se
 * persisten como JSON en Room y viajarán al backend en la Fase 6. La propia
 * línea también es @Serializable: se lleva como foto (JSON) en la navegación
 * de Cobro a Pago aceptado para poder pintar el ticket detallado, ya que el
 * carrito real se vacía en cuanto el pedido se envía con éxito.
 */
@Serializable
data class CartLine(
    val id: Long = 0L,
    val menuItemId: String,
    val restaurantProductId: String?,
    val name: String,
    val imageUrl: String?,
    val basePriceCents: Long,
    val currency: String,
    val quantity: Int,
    val selections: CartSelections,
) {
    /** Precio de una unidad con extras y suplementos aplicados. */
    val unitPriceCents: Long
        get() = basePriceCents +
            selections.modifiers.sumOf { it.priceDeltaCents } +
            selections.comboOptions.sumOf { it.supplementPriceCents }

    val totalCents: Long get() = unitPriceCents * quantity
}

@Serializable
data class CartSelections(
    val modifiers: List<SelectedModifier> = emptyList(),
    val comboOptions: List<SelectedComboOption> = emptyList(),
    val removedComponents: List<RemovedComponent> = emptyList(),
) {
    val isEmpty: Boolean
        get() = modifiers.isEmpty() && comboOptions.isEmpty() && removedComponents.isEmpty()
}

@Serializable
data class SelectedModifier(
    val groupId: String,
    val groupName: String,
    val optionId: String,
    val optionName: String,
    val priceDeltaCents: Long,
)

@Serializable
data class SelectedComboOption(
    val slotId: String,
    val slotName: String,
    val optionId: String,
    val restaurantProductId: String,
    val optionName: String,
    val supplementPriceCents: Long,
)

@Serializable
data class RemovedComponent(
    val componentId: String,
    val name: String,
)
