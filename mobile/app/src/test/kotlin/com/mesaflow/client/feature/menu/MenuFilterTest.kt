package com.mesaflow.client.feature.menu

import com.mesaflow.client.core.model.Allergen
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.MenuSection
import com.mesaflow.client.core.model.ModifierGroup
import com.mesaflow.client.core.model.ModifierOption
import com.mesaflow.client.core.model.PlatterComponent
import com.mesaflow.client.core.model.ProductType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuFilterTest {

    private fun item(
        id: String,
        name: String,
        description: String? = null,
        modifierGroups: List<ModifierGroup> = emptyList(),
        platterComponents: List<PlatterComponent> = emptyList(),
        allergens: List<Allergen> = emptyList(),
    ) = MenuItem(
        id = id,
        restaurantProductId = "rp-$id",
        name = name,
        description = description,
        imageUrl = null,
        productType = ProductType.SIMPLE,
        priceCents = 1000,
        currency = "EUR",
        isAvailable = true,
        modifierGroups = modifierGroups,
        comboDefinition = null,
        platterComponents = platterComponents,
        allergens = allergens,
    )

    private fun modifierGroup(vararg optionNames: String) = ModifierGroup(
        id = "group-${optionNames.joinToString()}",
        name = "Extras",
        singleSelection = false,
        minSelections = 0,
        maxSelections = optionNames.size,
        isRequired = false,
        options = optionNames.map { name ->
            ModifierOption(id = "opt-$name", name = name, priceDeltaCents = 0, isAvailable = true)
        },
    )

    private fun platterComponent(name: String) = PlatterComponent(
        id = "comp-$name",
        name = name,
        removable = true,
        replaceable = false,
        sortOrder = 0,
    )

    private val sections = listOf(
        MenuSection(
            id = "principales", name = "Principales", sortOrder = 1,
            items = listOf(
                item(
                    "burger", "Hamburguesa craft",
                    modifierGroups = listOf(modifierGroup("Bacon", "Extra queso")),
                    allergens = listOf(Allergen.GLUTEN, Allergen.MILK),
                ),
                item(
                    "salmon", "Salmón a la plancha",
                    platterComponents = listOf(platterComponent("Lechuga"), platterComponent("Salsa tártara")),
                    allergens = listOf(Allergen.FISH),
                ),
            ),
        ),
        MenuSection(
            id = "postres", name = "Postres", sortOrder = 2,
            items = listOf(item("coulant", "Coulant de chocolate", "Con helado de vainilla")),
        ),
    )

    @Test
    fun `sin filtros devuelve todas las secciones`() {
        val result = MenuFilter.filter(sections, query = "", selectedSectionId = null)
        assertEquals(2, result.size)
    }

    @Test
    fun `la busqueda ignora tildes y mayusculas`() {
        val result = MenuFilter.filter(sections, query = "SALMON", selectedSectionId = null)
        assertEquals(1, result.size)
        assertEquals("salmon", result.first().items.single().id)
    }

    @Test
    fun `la busqueda tambien mira la descripcion`() {
        val result = MenuFilter.filter(sections, query = "vainilla", selectedSectionId = null)
        assertEquals("coulant", result.single().items.single().id)
    }

    @Test
    fun `la busqueda tambien mira los nombres de los modificadores`() {
        val result = MenuFilter.filter(sections, query = "bacon", selectedSectionId = null)
        assertEquals("burger", result.single().items.single().id)
    }

    @Test
    fun `la busqueda tambien mira los componentes del platter`() {
        val result = MenuFilter.filter(sections, query = "tartara", selectedSectionId = null)
        assertEquals("salmon", result.single().items.single().id)
    }

    @Test
    fun `el filtro de categoria se combina con el texto`() {
        val result = MenuFilter.filter(sections, query = "chocolate", selectedSectionId = "principales")
        assertTrue(result.isEmpty())
    }

    @Test
    fun `las secciones sin resultados desaparecen`() {
        val result = MenuFilter.filter(sections, query = "hamburguesa", selectedSectionId = null)
        assertEquals(listOf("principales"), result.map { it.id })
    }

    @Test
    fun `sin alergenos excluidos aparecen todos los items`() {
        val result = MenuFilter.filter(sections, query = "", selectedSectionId = null, excludedAllergens = emptySet())
        assertEquals(3, result.sumOf { it.items.size })
    }

    @Test
    fun `excluir un alergeno oculta los items que lo contienen`() {
        val result = MenuFilter.filter(
            sections, query = "", selectedSectionId = null,
            excludedAllergens = setOf(Allergen.FISH),
        )
        val ids = result.flatMap { it.items }.map { it.id }
        assertTrue("salmon" !in ids)
        assertTrue("burger" in ids)
        assertTrue("coulant" in ids)
    }

    @Test
    fun `excluir varios alergenos combina las coincidencias`() {
        val result = MenuFilter.filter(
            sections, query = "", selectedSectionId = null,
            excludedAllergens = setOf(Allergen.GLUTEN, Allergen.FISH),
        )
        val ids = result.flatMap { it.items }.map { it.id }
        assertEquals(listOf("coulant"), ids)
    }

    @Test
    fun `el filtro de alergenos se combina con el de texto`() {
        val result = MenuFilter.filter(
            sections, query = "salmon", selectedSectionId = null,
            excludedAllergens = setOf(Allergen.FISH),
        )
        assertTrue(result.isEmpty())
    }
}
