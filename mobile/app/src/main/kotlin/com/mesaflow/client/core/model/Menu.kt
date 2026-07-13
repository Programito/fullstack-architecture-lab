package com.mesaflow.client.core.model

/** Carta del restaurante tal y como la consume la UI. */
data class Menu(
    val id: String,
    val restaurantId: String,
    val name: String,
    val sections: List<MenuSection>,
)

/**
 * Variantes de nombre por idioma (ES/CA/EN), aditivas y opcionales junto al
 * nombre canonico en castellano (campo `name` de cada entidad). El backend
 * siempre devuelve las que existan; esta app resuelve cual mostrar segun su
 * idioma activo (ver [com.mesaflow.client.core.common.resolveName]) — nunca
 * se resuelve en el servidor, para no perder la cache ETag/304 de la carta.
 * Ver docs/superpowers/plans/2026-07-11-menu-multilingual-names.md.
 *
 * El mismo tipo se reutiliza para `descriptionI18n` en [MenuItem] (misma
 * forma `{es, ca, en}`, solo cambia que envuelve la descripcion en vez del
 * nombre) — ver docs/superpowers/plans/2026-07-11-menu-multilingual-names.md,
 * Fase 5/6.
 */
data class NameI18n(
    val es: String? = null,
    val ca: String? = null,
    val en: String? = null,
)

data class MenuSection(
    val id: String,
    val name: String,
    val nameI18n: NameI18n? = null,
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
    val nameI18n: NameI18n? = null,
    val description: String?,
    // Variantes de descripcion por idioma (ES/CA/EN), mismo patron aditivo
    // que nameI18n. Ver docs/superpowers/plans/2026-07-11-menu-multilingual-names.md,
    // Fase 5 (admin web) / Fase 6 (esta).
    val descriptionI18n: NameI18n? = null,
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
    val nameI18n: NameI18n? = null,
    val singleSelection: Boolean,
    val minSelections: Int,
    val maxSelections: Int,
    val isRequired: Boolean,
    val options: List<ModifierOption>,
)

data class ModifierOption(
    val id: String,
    val name: String,
    val nameI18n: NameI18n? = null,
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
    val nameI18n: NameI18n? = null,
    val minSelections: Int,
    val maxSelections: Int,
    val isRequired: Boolean,
    val options: List<ComboSlotOption>,
)

// Sin nameI18n propio: su nombre de display viene del RestaurantProduct/Product
// asociado, no de un campo propio (ver nota equivalente en MenuDtos.kt).
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
    val nameI18n: NameI18n? = null,
    val removable: Boolean,
    val replaceable: Boolean,
    val sortOrder: Int,
)

/** Tiene algo configurable (tamaño/variantes, extras, combo o ingredientes quitables). */
val MenuItem.isConfigurable: Boolean
    get() = modifierGroups.isNotEmpty() ||
        comboDefinition?.slots.orEmpty().isNotEmpty() ||
        platterComponents.any { it.removable }

/** Busca un producto de la carta por id; usado al reabrir el configurador (Carta/Carrito). */
fun Menu.findItemById(itemId: String): MenuItem? =
    sections
        .asSequence()
        .flatMap { it.items.asSequence() }
        .firstOrNull { it.id == itemId }
