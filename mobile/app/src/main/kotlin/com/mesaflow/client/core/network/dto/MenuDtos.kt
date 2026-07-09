package com.mesaflow.client.core.network.dto

import kotlinx.serialization.Serializable

/* Espejo de backend restaurant-menu-response.dto.ts (GET /restaurants/:id/menu). */

@Serializable
data class RestaurantMenuDto(
    val id: String = "",
    val restaurantId: String = "",
    val name: String = "",
    val isActive: Boolean = true,
    val sections: List<MenuSectionDto> = emptyList(),
)

@Serializable
data class MenuSectionDto(
    val id: String,
    val name: String,
    val sortOrder: Int = 0,
    val isVisible: Boolean = true,
    val items: List<MenuItemDto> = emptyList(),
)

@Serializable
data class MenuItemDto(
    val id: String,
    val restaurantProductId: String? = null,
    val productId: String? = null,
    val name: String,
    val description: String? = null,
    val imageUrl: String? = null,
    val productType: String = "simple",
    val priceCents: Long = 0,
    val currency: String = "EUR",
    val isAvailable: Boolean = true,
    val defaultCourse: String? = null,
    val preparationRoute: String? = null,
    val allergens: List<String> = emptyList(),
    val modifierGroups: List<ModifierGroupDto> = emptyList(),
    val comboDefinition: ComboDefinitionDto? = null,
    val platterComponents: List<PlatterComponentDto> = emptyList(),
)

@Serializable
data class ModifierGroupDto(
    val id: String,
    val name: String,
    val selectionType: String = "multiple",
    val minSelections: Int = 0,
    val maxSelections: Int = 0,
    val isRequired: Boolean = false,
    val options: List<ModifierOptionDto> = emptyList(),
)

@Serializable
data class ModifierOptionDto(
    val id: String,
    val name: String,
    val priceDeltaCents: Long = 0,
    val isAvailable: Boolean = true,
)

@Serializable
data class ComboDefinitionDto(
    val id: String = "",
    val slots: List<ComboSlotDto> = emptyList(),
)

@Serializable
data class ComboSlotDto(
    val id: String,
    val name: String,
    val minSelections: Int = 0,
    val maxSelections: Int = 1,
    val isRequired: Boolean = false,
    val options: List<ComboSlotOptionDto> = emptyList(),
)

@Serializable
data class ComboSlotOptionDto(
    val id: String,
    val restaurantProductId: String = "",
    val name: String,
    val supplementPriceCents: Long = 0,
    val isAvailable: Boolean = true,
)

@Serializable
data class PlatterComponentDto(
    val id: String,
    val name: String,
    val removable: Boolean = false,
    val replaceable: Boolean = false,
    val sortOrder: Int = 0,
)
