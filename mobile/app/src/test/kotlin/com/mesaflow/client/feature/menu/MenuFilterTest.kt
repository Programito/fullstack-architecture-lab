package com.mesaflow.client.feature.menu

import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.MenuSection
import com.mesaflow.client.core.model.ProductType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuFilterTest {

    private fun item(id: String, name: String, description: String? = null) = MenuItem(
        id = id,
        restaurantProductId = "rp-$id",
        name = name,
        description = description,
        imageUrl = null,
        productType = ProductType.SIMPLE,
        priceCents = 1000,
        currency = "EUR",
        isAvailable = true,
        modifierGroups = emptyList(),
        comboDefinition = null,
        platterComponents = emptyList(),
    )

    private val sections = listOf(
        MenuSection(
            id = "principales", name = "Principales", sortOrder = 1,
            items = listOf(item("burger", "Hamburguesa craft"), item("salmon", "Salmón a la plancha")),
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
    fun `el filtro de categoria se combina con el texto`() {
        val result = MenuFilter.filter(sections, query = "chocolate", selectedSectionId = "principales")
        assertTrue(result.isEmpty())
    }

    @Test
    fun `las secciones sin resultados desaparecen`() {
        val result = MenuFilter.filter(sections, query = "hamburguesa", selectedSectionId = null)
        assertEquals(listOf("principales"), result.map { it.id })
    }
}
