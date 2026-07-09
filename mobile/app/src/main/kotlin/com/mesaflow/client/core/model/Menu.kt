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

/**
 * Los 14 alergenos de declaracion obligatoria en la UE (Reglamento 1169/2011,
 * anexo II), tal y como los declara el propio restaurante en el backend
 * (`Product.allergens`). UNKNOWN cubre valores que el backend pueda enviar y
 * esta version de la app no reconozca todavia: se mantiene visible en vez de
 * descartarse en silencio, porque ocultar un alergeno no identificado es
 * peor que mostrarlo como "otro".
 */
enum class Allergen {
    GLUTEN,
    CRUSTACEANS,
    EGGS,
    FISH,
    PEANUTS,
    SOYBEANS,
    MILK,
    NUTS,
    CELERY,
    MUSTARD,
    SESAME,
    SULPHITES,
    LUPIN,
    MOLLUSCS,
    UNKNOWN,
}

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
    // Alergenos declarados por el restaurante para este producto. Lista
    // vacia por defecto para no romper construcciones existentes (tests,
    // fixtures) que no dependen de este campo.
    val allergens: List<Allergen> = emptyList(),
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
