package com.mesaflow.client.core.data

import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import com.mesaflow.client.core.model.RemovedComponent
import com.mesaflow.client.core.model.SelectedComboOption
import com.mesaflow.client.core.model.SelectedModifier
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderMappersTest {

    private fun line(
        restaurantProductId: String? = "prod-1",
        selections: CartSelections = CartSelections(),
    ) = CartLine(
        id = 1L,
        menuItemId = "item-1",
        restaurantProductId = restaurantProductId,
        name = "Burger",
        imageUrl = null,
        basePriceCents = 1000,
        currency = "EUR",
        quantity = 2,
        selections = selections,
    )

    @Test
    fun `mapea producto simple con cantidad`() {
        val request = line().toAddLineRequest()!!
        assertEquals("prod-1", request.restaurantProductId)
        assertEquals(2, request.quantity)
        assertTrue(request.modifiers.isEmpty())
        assertTrue(request.comboSlots.isEmpty())
        assertTrue(request.platterComponents.isEmpty())
        assertNull(request.kitchenNote)
    }

    @Test
    fun `sin restaurantProductId no se puede mapear`() {
        assertNull(line(restaurantProductId = null).toAddLineRequest())
    }

    @Test
    fun `mapea extras combo y quitados al contrato del backend`() {
        val selections = CartSelections(
            modifiers = listOf(SelectedModifier("g1", "Extras", "o-bacon", "Bacon", 150)),
            comboOptions = listOf(
                SelectedComboOption("s-drink", "Bebida", "c-cola", "p-cola", "Cola", 80),
            ),
            removedComponents = listOf(RemovedComponent("pc-onion", "Cebolla")),
        )
        val request = line(selections = selections).toAddLineRequest()!!

        assertEquals("g1", request.modifiers.single().modifierGroupId)
        assertEquals("o-bacon", request.modifiers.single().modifierOptionId)
        assertEquals(1, request.modifiers.single().quantity)

        assertEquals("s-drink", request.comboSlots.single().comboSlotId)
        // El backend espera el restaurantProductId del producto elegido, no el id de la opción.
        assertEquals("p-cola", request.comboSlots.single().restaurantProductId)

        assertEquals("pc-onion", request.platterComponents.single().platterComponentId)
        assertEquals(false, request.platterComponents.single().included)
    }
}
