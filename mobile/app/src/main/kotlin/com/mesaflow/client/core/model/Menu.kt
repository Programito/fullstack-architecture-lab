package com.mesaflow.client.core.model

/** Carta del restaurante tal y como la consume la UI. */
data class Menu(
    val id: String,
    val restaurantId: String,
    val name: String,
    val sections: List<MenuSection>,
)

data class MenuSection(
    val id: String,
    val name: String,
    val sortOrder: Int,
    val items: List<MenuItem>,
)

enum class ProductType { SIMPLE, COMBO, PLATTER }

data class MenuItem(
    val id: String,
    val restaurantProductId: String?,
    val name: String,
    val description: String?,
    val imageUrl: String?,
    val productType: ProductType,
    val priceCents: Long,
    val currency: String,
    val isAvailable: Boolean,
    val modifierGroups: List<ModifierGroup>,
    val comboDefinition: ComboDefinition?,
    val platterComponents: List<PlatterComponent>,
)

data class ModifierGroup(
    val id: String,
    val name: String,
    val singleSelection: Boolean,
    val minSelections: Int,
    val maxSelections: Int,
    val isRequired: Boolean,
    val options: List<ModifierOption>,
)

data class ModifierOption(
    val id: String,
    val name: String,
    val priceDeltaCents: Long,
    val isAvailable: Boolean,
)

data class ComboDefinition(
    val id: String,
    val slots: List<ComboSlot>,
)

data class ComboSlot(
    val id: String,
    val name: String,
    val minSelections: Int,
    val maxSelections: Int,
    val isRequired: Boolean,
    val options: List<ComboSlotOption>,
)

data class ComboSlotOption(
    val id: String,
    val restaurantProductId: String,
    val name: String,
    val supplementPriceCents: Long,
    val isAvailable: Boolean,
)

data class PlatterComponent(
    val id: String,
    val name: String,
    val removable: Boolean,
    val replaceable: Boolean,
    val sortOrder: Int,
)
