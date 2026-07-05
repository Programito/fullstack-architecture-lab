package com.mesaflow.client.core.common

import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Test

class PriceFormatterTest {

    /** Los JDK modernos usan espacios no separables (U+00A0 / U+202F) en algunos locales. */
    private fun String.normalizeSpaces() = replace(' ', ' ').replace(' ', ' ')

    @Test
    fun `formatea euros en locale espanol`() {
        val result = PriceFormatter.format(1250, "EUR", Locale.forLanguageTag("es-ES"))
        assertEquals("12,50 €", result.normalizeSpaces())
    }

    @Test
    fun `formatea dolares en locale US`() {
        val result = PriceFormatter.format(1250, "USD", Locale.US)
        assertEquals("$12.50", result)
    }

    @Test
    fun `cero se formatea sin sorpresas`() {
        val result = PriceFormatter.format(0, "EUR", Locale.forLanguageTag("es-ES"))
        assertEquals("0,00 €", result.normalizeSpaces())
    }

    @Test
    fun `delta positivo lleva signo mas`() {
        val result = PriceFormatter.formatDelta(150, "EUR", Locale.forLanguageTag("es-ES"))
        assertEquals("+1,50 €", result.normalizeSpaces())
    }

    @Test
    fun `delta negativo lleva signo menos`() {
        val result = PriceFormatter.formatDelta(-150, "EUR", Locale.forLanguageTag("es-ES"))
        assertEquals("−1,50 €", result.normalizeSpaces())
    }

    @Test
    fun `moneda desconocida no revienta y usa el locale`() {
        val result = PriceFormatter.format(1250, "XXX-INVALID", Locale.forLanguageTag("es-ES"))
        assertEquals("12,50 €", result.normalizeSpaces())
    }
}
