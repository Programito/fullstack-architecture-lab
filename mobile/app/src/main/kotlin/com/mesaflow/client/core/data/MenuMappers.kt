package com.mesaflow.client.core.data

import com.mesaflow.client.core.model.Allergen
import com.mesaflow.client.core.model.ComboDefinition
import com.mesaflow.client.core.model.ComboSlot
import com.mesaflow.client.core.model.ComboSlotOption
import com.mesaflow.client.core.model.Menu
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.MenuSection
import com.mesaflow.client.core.model.ModifierGroup
import com.mesaflow.client.core.model.ModifierOption
import com.mesaflow.client.core.model.NameI18n
import com.mesaflow.client.core.model.PlatterComponent
import com.mesaflow.client.core.model.ProductType
import com.mesaflow.client.core.network.dto.NameI18nDto
import com.mesaflow.client.core.network.dto.RestaurantMenuDto

/** Mapea el DTO del backend a dominio, descartando secciones/items no visibles. */
internal fun RestaurantMenuDto.toDomain(): Menu = Menu(
    id = id,
    restaurantId = restaurantId,
    name = name,
    sections = sections
        .filter { it.isVisible }
        .sortedBy { it.sortOrder }
        .map { section ->
            MenuSection(
                id = section.id,
                name = section.name,
                nameI18n = section.nameI18n.toDomain(),
                sortOrder = section.sortOrder,
                items = section.items.map { item ->
                    MenuItem(
                        id = item.id,
                        restaurantProductId = item.restaurantProductId,
                        name = item.name,
                        nameI18n = item.nameI18n.toDomain(),
                        description = item.description,
                        descriptionI18n = item.descriptionI18n.toDomain(),
                        imageUrl = item.imageUrl,
                        productType = when (item.productType.lowercase()) {
                            "combo" -> ProductType.COMBO
                            "platter" -> ProductType.PLATTER
                            else -> ProductType.SIMPLE
                        },
                        priceCents = item.priceCents,
                        currency = item.currency,
                        isAvailable = item.isAvailable,
                        allergens = item.allergens.map { it.toAllergenOrUnknown() },
                        modifierGroups = item.modifierGroups.map { group ->
                            ModifierGroup(
                                id = group.id,
                                name = group.name,
                                nameI18n = group.nameI18n.toDomain(),
                                singleSelection = group.selectionType.equals("single", ignoreCase = true),
                                minSelections = group.minSelections,
                                maxSelections = group.maxSelections,
                                isRequired = group.isRequired,
                                options = group.options.map { opt ->
                                    ModifierOption(
                                        id = opt.id,
                                        name = opt.name,
                                        nameI18n = opt.nameI18n.toDomain(),
                                        priceDeltaCents = opt.priceDeltaCents,
                                        isAvailable = opt.isAvailable,
                                    )
                                },
                            )
                        },
                        comboDefinition = item.comboDefinition?.let { combo ->
                            ComboDefinition(
                                id = combo.id,
                                slots = combo.slots.map { slot ->
                                    ComboSlot(
                                        id = slot.id,
                                        name = slot.name,
                                        nameI18n = slot.nameI18n.toDomain(),
                                        minSelections = slot.minSelections,
                                        maxSelections = slot.maxSelections,
                                        isRequired = slot.isRequired,
                                        options = slot.options.map { opt ->
                                            ComboSlotOption(
                                                id = opt.id,
                                                restaurantProductId = opt.restaurantProductId,
                                                name = opt.name,
                                                supplementPriceCents = opt.supplementPriceCents,
                                                isAvailable = opt.isAvailable,
                                            )
                                        },
                                    )
                                },
                            )
                        },
                        platterComponents = item.platterComponents
                            .sortedBy { it.sortOrder }
                            .map { comp ->
                                PlatterComponent(
                                    id = comp.id,
                                    name = comp.name,
                                    nameI18n = comp.nameI18n.toDomain(),
                                    removable = comp.removable,
                                    replaceable = comp.replaceable,
                                    sortOrder = comp.sortOrder,
                                )
                            },
                    )
                },
            )
        },
)

private fun NameI18nDto?.toDomain(): NameI18n? =
    this?.let { NameI18n(es = it.es, ca = it.ca, en = it.en) }

/**
 * Convierte el string del backend (enum Allergen de schema.prisma, p.ej.
 * "gluten", "crustaceans") al enum de dominio. Un valor no reconocido cae en
 * [Allergen.UNKNOWN] en vez de descartarse: silenciar un alergeno que el
 * backend SI declara seria peor que mostrarlo como "otro".
 */
internal fun String.toAllergenOrUnknown(): Allergen = when (lowercase()) {
    "gluten" -> Allergen.GLUTEN
    "crustaceans" -> Allergen.CRUSTACEANS
    "eggs" -> Allergen.EGGS
    "fish" -> Allergen.FISH
    "peanuts" -> Allergen.PEANUTS
    "soybeans" -> Allergen.SOYBEANS
    "milk" -> Allergen.MILK
    "nuts" -> Allergen.NUTS
    "celery" -> Allergen.CELERY
    "mustard" -> Allergen.MUSTARD
    "sesame" -> Allergen.SESAME
    "sulphites" -> Allergen.SULPHITES
    "lupin" -> Allergen.LUPIN
    "molluscs" -> Allergen.MOLLUSCS
    else -> Allergen.UNKNOWN
}
