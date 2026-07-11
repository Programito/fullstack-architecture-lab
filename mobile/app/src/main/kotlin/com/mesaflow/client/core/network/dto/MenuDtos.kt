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

/**
 * Variantes de nombre por idioma (ES/CA/EN), aditivas y opcionales junto al
 * nombre canonico en castellano (`name`). Espejo de NameI18nResponseDto en
 * backend/.../restaurant-menu-response.dto.ts. Ver
 * docs/superpowers/plans/2026-07-11-menu-multilingual-names.md.
 */
@Serializable
data class NameI18nDto(
    val es: String? = null,
    val ca: String? = null,
    val en: String? = null,
)

@Serializable
data class MenuSectionDto(
    val id: String,
    val name: String,
    val nameI18n: NameI18nDto? = null,
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
    val nameI18n: NameI18nDto? = null,
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
    val nameI18n: NameI18nDto? = null,
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
    val nameI18n: NameI18nDto? = null,
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
    val nameI18n: NameI18nDto? = null,
    val minSelections: Int = 0,
    val maxSelections: Int = 1,
    val isRequired: Boolean = false,
    val options: List<ComboSlotOptionDto> = emptyList(),
)

// ComboSlotOption no lleva nameI18n propio: su nombre de display viene del
// RestaurantProduct/Product asociado, no de un campo propio del slot-option
// (igual que en backend/frontend, ver Fase 1 Paso 3 del plan multiidioma).
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
    val nameI18n: NameI18nDto? = null,
    val removable: Boolean = false,
    val replaceable: Boolean = false,
    val sortOrder: Int = 0,
)
