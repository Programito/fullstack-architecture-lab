package com.mesaflow.client.feature.product

import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import com.mesaflow.client.core.model.ComboSlot
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.ModifierGroup
import com.mesaflow.client.core.model.RemovedComponent
import com.mesaflow.client.core.model.SelectedComboOption
import com.mesaflow.client.core.model.SelectedModifier

/**
 * Estado inmutable del configurador de producto. Lógica pura (sin Android):
 * togglear opciones respeta las reglas de cada grupo/slot, el precio se
 * recalcula a partir de las selecciones y [isValid] decide si se puede añadir
 * al carrito. La UI (bottom sheet) solo pinta este estado.
 */
data class ProductConfig(
    val item: MenuItem,
    val quantity: Int = 1,
    /** groupId -> optionIds elegidos. */
    val optionsByGroup: Map<String, Set<String>> = emptyMap(),
    /** slotId (combo) -> optionIds elegidos. */
    val optionsBySlot: Map<String, Set<String>> = emptyMap(),
    /** Ingredientes de platter marcados como "sin". */
    val removedComponentIds: Set<String> = emptySet(),
) {

    fun withQuantity(value: Int): ProductConfig = copy(quantity = value.coerceIn(1, MAX_QUANTITY))

    /**
     * Selecciona/deselecciona una opción de un grupo de modificadores.
     * - Grupo de selección única: la opción nueva reemplaza a la anterior.
     * - Grupo múltiple: añade hasta maxSelections; tocar una elegida la quita.
     */
    fun toggleModifier(group: ModifierGroup, optionId: String): ProductConfig {
        val current = optionsByGroup[group.id].orEmpty()
        val updated = toggleSelection(current, optionId, group.singleSelection, group.maxSelections)
        return copy(optionsByGroup = optionsByGroup + (group.id to updated))
    }

    /** Igual que [toggleModifier] pero para un slot de combo. */
    fun toggleComboOption(slot: ComboSlot, optionId: String): ProductConfig {
        val single = slot.maxSelections <= 1
        val current = optionsBySlot[slot.id].orEmpty()
        val updated = toggleSelection(current, optionId, single, slot.maxSelections)
        return copy(optionsBySlot = optionsBySlot + (slot.id to updated))
    }

    /** Marca/desmarca un ingrediente quitable ("sin cebolla"). */
    fun toggleRemovedComponent(componentId: String): ProductConfig {
        val removable = item.platterComponents.any { it.id == componentId && it.removable }
        if (!removable) return this
        val updated = if (componentId in removedComponentIds) {
            removedComponentIds - componentId
        } else {
            removedComponentIds + componentId
        }
        return copy(removedComponentIds = updated)
    }

    /** Todas las reglas min/max de grupos requeridos y slots satisfechas. */
    val isValid: Boolean
        get() = item.modifierGroups.all { group ->
            val count = optionsByGroup[group.id].orEmpty().size
            val min = if (group.isRequired) maxOf(group.minSelections, 1) else group.minSelections
            count >= min && count <= maxOf(group.maxSelections, min)
        } && item.comboDefinition?.slots.orEmpty().all { slot ->
            val count = optionsBySlot[slot.id].orEmpty().size
            val min = if (slot.isRequired) maxOf(slot.minSelections, 1) else slot.minSelections
            count >= min && count <= maxOf(slot.maxSelections, min)
        }

    val unitPriceCents: Long
        get() = item.priceCents +
            selectedModifiers().sumOf { it.priceDeltaCents } +
            selectedComboOptions().sumOf { it.supplementPriceCents }

    val totalCents: Long get() = unitPriceCents * quantity

    /** Congela la configuración actual como línea de carrito. */
    fun toCartLine(): CartLine = CartLine(
        menuItemId = item.id,
        restaurantProductId = item.restaurantProductId,
        name = item.name,
        imageUrl = item.imageUrl,
        basePriceCents = item.priceCents,
        currency = item.currency,
        quantity = quantity,
        selections = CartSelections(
            modifiers = selectedModifiers(),
            comboOptions = selectedComboOptions(),
            removedComponents = item.platterComponents
                .filter { it.id in removedComponentIds }
                .map { RemovedComponent(componentId = it.id, name = it.name) },
        ),
    )

    private fun selectedModifiers(): List<SelectedModifier> =
        item.modifierGroups.flatMap { group ->
            val chosen = optionsByGroup[group.id].orEmpty()
            group.options.filter { it.id in chosen }.map { option ->
                SelectedModifier(
                    groupId = group.id,
                    groupName = group.name,
                    optionId = option.id,
                    optionName = option.name,
                    priceDeltaCents = option.priceDeltaCents,
                )
            }
        }

    private fun selectedComboOptions(): List<SelectedComboOption> =
        item.comboDefinition?.slots.orEmpty().flatMap { slot ->
            val chosen = optionsBySlot[slot.id].orEmpty()
            slot.options.filter { it.id in chosen }.map { option ->
                SelectedComboOption(
                    slotId = slot.id,
                    slotName = slot.name,
                    optionId = option.id,
                    restaurantProductId = option.restaurantProductId,
                    optionName = option.name,
                    supplementPriceCents = option.supplementPriceCents,
                )
            }
        }

    private fun toggleSelection(
        current: Set<String>,
        optionId: String,
        singleSelection: Boolean,
        maxSelections: Int,
    ): Set<String> = when {
        optionId in current -> current - optionId
        singleSelection -> setOf(optionId)
        current.size >= maxOf(maxSelections, 1) -> current // lleno: ignora
        else -> current + optionId
    }

    companion object {
        const val MAX_QUANTITY = 99
    }
}
