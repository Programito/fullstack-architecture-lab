package com.mesaflow.client.core.common

import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.NameI18n
import org.junit.Assert.assertEquals
import org.junit.Test

class NameResolutionTest {

    @Test
    fun `con las tres variantes, resuelve la del idioma activo`() {
        val nameI18n = NameI18n(es = "Hamburguesa", ca = "Hamburguesa (ca)", en = "Burger")

        assertEquals("Hamburguesa", resolveName(nameI18n, fallback = "Hamburguesa", localeTag = "es"))
        assertEquals("Hamburguesa (ca)", resolveName(nameI18n, fallback = "Hamburguesa", localeTag = "ca"))
        assertEquals("Burger", resolveName(nameI18n, fallback = "Hamburguesa", localeTag = "en"))
    }

    @Test
    fun `con nameI18n nulo, siempre devuelve el fallback`() {
        assertEquals("Hamburguesa", resolveName(nameI18n = null, fallback = "Hamburguesa", localeTag = "en"))
    }

    @Test
    fun `con solo la variante en castellano, cae al fallback para los otros idiomas`() {
        val nameI18n = NameI18n(es = "Hamburguesa")

        assertEquals("Hamburguesa", resolveName(nameI18n, fallback = "Hamburguesa", localeTag = "es"))
        assertEquals("Hamburguesa", resolveName(nameI18n, fallback = "Hamburguesa", localeTag = "ca"))
        assertEquals("Hamburguesa", resolveName(nameI18n, fallback = "Hamburguesa", localeTag = "en"))
    }

    @Test
    fun `una variante en blanco no reemplaza al fallback`() {
        // Ej.: el admin dejo el campo "Nombre (ingles)" vacio a proposito.
        val nameI18n = NameI18n(es = "Hamburguesa", en = "   ")

        assertEquals("Hamburguesa", resolveName(nameI18n, fallback = "Hamburguesa", localeTag = "en"))
    }

    @Test
    fun `un idioma no soportado cae al fallback`() {
        val nameI18n = NameI18n(es = "Hamburguesa", ca = "Hamburguesa (ca)", en = "Burger")

        assertEquals("Hamburguesa", resolveName(nameI18n, fallback = "Hamburguesa", localeTag = "fr"))
    }

    @Test
    fun `AppLanguage con tag fijo resuelve directamente a ese tag`() {
        assertEquals("ca", AppLanguage.CA.resolveLocaleTag())
        assertEquals("en", AppLanguage.EN.resolveLocaleTag())
        assertEquals("es", AppLanguage.ES.resolveLocaleTag())
    }

    @Test
    fun `resolveDescription con las tres variantes, resuelve la del idioma activo`() {
        val descriptionI18n = NameI18n(es = "Con queso", ca = "Amb formatge", en = "With cheese")

        assertEquals("Con queso", resolveDescription(descriptionI18n, fallback = "Con queso", localeTag = "es"))
        assertEquals("Amb formatge", resolveDescription(descriptionI18n, fallback = "Con queso", localeTag = "ca"))
        assertEquals("With cheese", resolveDescription(descriptionI18n, fallback = "Con queso", localeTag = "en"))
    }

    @Test
    fun `resolveDescription con descriptionI18n nulo, devuelve el fallback (que puede ser null)`() {
        assertEquals("Con queso", resolveDescription(descriptionI18n = null, fallback = "Con queso", localeTag = "en"))
        assertEquals(null, resolveDescription(descriptionI18n = null, fallback = null, localeTag = "en"))
    }

    @Test
    fun `resolveDescription con variante en blanco no reemplaza al fallback`() {
        val descriptionI18n = NameI18n(es = "Con queso", en = "   ")

        assertEquals("Con queso", resolveDescription(descriptionI18n, fallback = "Con queso", localeTag = "en"))
    }
}
