package com.mesaflow.client.core.network.dto

import kotlinx.serialization.json.Json
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Regresión: kotlinx.serialization omite por defecto los campos cuyo valor
 * coincide con el default de la data class (p.ej. quantity=1), y el backend
 * los recibe como undefined -> 400 de class-validator. Estos tests
 * serializan de verdad (no comparan objetos) con la MISMA config que usa
 * NetworkModule.provideJson(), para detectar si esa config vuelve a
 * romperse sin tener que reproducirlo contra el backend real.
 */
class OrderDtosSerializationTest {

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
        encodeDefaults = true
    }

    @Test
    fun `quantity con valor por defecto viaja en el JSON del modificador`() {
        val dto = OrderLineModifierRequestDto(modifierGroupId = "g1", modifierOptionId = "o1")
        val encoded = json.encodeToString(OrderLineModifierRequestDto.serializer(), dto)
        assertTrue("El JSON debe incluir quantity aunque sea el valor por defecto: $encoded", encoded.contains("\"quantity\":1"))
    }

    @Test
    fun `quantity con valor por defecto viaja en el JSON del slot de combo`() {
        val dto = OrderLineComboSlotRequestDto(comboSlotId = "s1", restaurantProductId = "p1")
        val encoded = json.encodeToString(OrderLineComboSlotRequestDto.serializer(), dto)
        assertTrue("El JSON debe incluir quantity aunque sea el valor por defecto: $encoded", encoded.contains("\"quantity\":1"))
    }

    @Test
    fun `campos opcionales por defecto tambien viajan en la linea de pedido`() {
        val dto = AddOrderLineRequestDto(restaurantProductId = "p1", quantity = 2)
        val encoded = json.encodeToString(AddOrderLineRequestDto.serializer(), dto)
        assertTrue(encoded.contains("\"modifiers\":[]"))
        assertTrue(encoded.contains("\"comboSlots\":[]"))
        assertTrue(encoded.contains("\"platterComponents\":[]"))
    }
}
