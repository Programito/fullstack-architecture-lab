package com.mesaflow.client.core.data

import com.mesaflow.client.core.model.Allergen
import com.mesaflow.client.core.network.dto.MenuItemDto
import com.mesaflow.client.core.network.dto.MenuSectionDto
import com.mesaflow.client.core.network.dto.RestaurantMenuDto
import org.junit.Assert.assertEquals
import org.junit.Test

class MenuMappersTest {

    private fun menuWithAllergens(allergens: List<String>) = RestaurantMenuDto(
        id = "menu-1",
        restaurantId = "rest-1",
        name = "Carta",
        isActive = true,
        sections = listOf(
            MenuSectionDto(
                id = "sec-1",
                name = "Principales",
                sortOrder = 0,
                isVisible = true,
                items = listOf(
                    MenuItemDto(
                        id = "item-1",
                        name = "Hamburguesa",
                        priceCents = 1000,
                        allergens = allergens,
                    ),
                ),
            ),
        ),
    )

    @Test
    fun `mapea los alergenos reconocidos del backend`() {
        val menu = menuWithAllergens(listOf("gluten", "milk", "sesame")).toDomain()

        assertEquals(
            listOf(Allergen.GLUTEN, Allergen.MILK, Allergen.SESAME),
            menu.sections.single().items.single().allergens,
        )
    }

    @Test
    fun `un item sin alergenos declarados mapea una lista vacia`() {
        val menu = menuWithAllergens(emptyList()).toDomain()

        assertEquals(emptyList<Allergen>(), menu.sections.single().items.single().allergens)
    }

    @Test
    fun `un alergeno no reconocido cae en UNKNOWN en vez de descartarse`() {
        // Si el backend algun dia añade un alergeno que esta version de la app
        // no conoce todavia, no debe desaparecer en silencio: eso ocultaria
        // un riesgo real al usuario.
        val menu = menuWithAllergens(listOf("gluten", "some_future_allergen")).toDomain()

        assertEquals(
            listOf(Allergen.GLUTEN, Allergen.UNKNOWN),
            menu.sections.single().items.single().allergens,
        )
    }

    @Test
    fun `la comparacion de alergenos no distingue mayusculas`() {
        val menu = menuWithAllergens(listOf("GLUTEN", "Milk")).toDomain()

        assertEquals(
            listOf(Allergen.GLUTEN, Allergen.MILK),
            menu.sections.single().items.single().allergens,
        )
    }
}
