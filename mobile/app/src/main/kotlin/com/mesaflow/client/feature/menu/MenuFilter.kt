package com.mesaflow.client.feature.menu

import com.mesaflow.client.core.model.MenuSection
import java.text.Normalizer

/**
 * Filtro de la carta: por texto (sin distinguir tildes ni mayusculas,
 * sobre nombre y descripcion) y por seccion. Logica pura y testeable.
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
    ): List<MenuSection> {
        val normalizedQuery = normalize(query)
        return sections
            .filter { selectedSectionId == null || it.id == selectedSectionId }
            .map { section ->
                if (normalizedQuery.isEmpty()) {
                    section
                } else {
                    section.copy(
                        items = section.items.filter { item ->
                            normalize(item.name).contains(normalizedQuery) ||
                                normalize(item.description.orEmpty()).contains(normalizedQuery)
                        },
                    )
                }
            }
            .filter { it.items.isNotEmpty() }
    }

    private val MARKS_REGEX = Regex("\\p{Mn}+")
}
