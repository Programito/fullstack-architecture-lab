package com.mesaflow.client.feature.menu

import com.mesaflow.client.core.model.Allergen
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.MenuSection
import java.text.Normalizer

/**
 * Filtro de la carta: por texto (sin distinguir tildes ni mayusculas, sobre
 * nombre, descripcion, extras/modificadores y componentes del platter), por
 * seccion y por alergenos a evitar. Logica pura y testeable.
 *
 * El filtro de texto NO es un filtro de alergenos: solo compara el texto de
 * la busqueda contra los nombres que ya vienen en la carta (p.ej. "Bacon",
 * "Lechuga"). Que un producto no mencione un ingrediente en su texto no
 * garantiza que no lo lleve.
 *
 * [excludedAllergens] es distinto: se basa en el campo `allergens` que
 * declara el propio restaurante para cada producto (backend
 * `Product.allergens`), no en texto libre. Aun asi, la fiabilidad depende de
 * que el restaurante lo haya rellenado bien — la app no puede verificarlo de
 * forma independiente, por eso la UI sigue recordando confirmar con el
 * personal ante alergias graves.
 */
object MenuFilter {

    fun normalize(text: String): String =
        Normalizer.normalize(text, Normalizer.Form.NFD)
            .replace(MARKS_REGEX, "")
            .lowercase()
            .trim()

    fun filter(
        sections: List<MenuSection>,
        query: String,
        selectedSectionId: String?,
        excludedAllergens: Set<Allergen> = emptySet(),
    ): List<MenuSection> {
        val normalizedQuery = normalize(query)
        return sections
            .filter { selectedSectionId == null || it.id == selectedSectionId }
            .map { section ->
                section.copy(
                    items = section.items.filter { item ->
                        matchesQuery(item, normalizedQuery) && excludedAllergens.none { it in item.allergens }
                    },
                )
            }
            .filter { it.items.isNotEmpty() }
    }

    private fun matchesQuery(item: MenuItem, normalizedQuery: String): Boolean {
        if (normalizedQuery.isEmpty()) return true
        return normalize(item.name).contains(normalizedQuery) ||
            normalize(item.description.orEmpty()).contains(normalizedQuery) ||
            item.modifierGroups.any { group ->
                group.options.any { normalize(it.name).contains(normalizedQuery) }
            } ||
            item.platterComponents.any { normalize(it.name).contains(normalizedQuery) }
    }

    private val MARKS_REGEX = Regex("\\p{Mn}+")
}
