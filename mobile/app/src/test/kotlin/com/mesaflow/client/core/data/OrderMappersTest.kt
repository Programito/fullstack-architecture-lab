package com.mesaflow.client.core.data

import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import com.mesaflow.client.core.model.OrderLineKitchenStatus
import com.mesaflow.client.core.model.RemovedComponent
import com.mesaflow.client.core.model.SelectedComboOption
import com.mesaflow.client.core.model.SelectedModifier
import com.mesaflow.client.core.network.dto.ServicePointOrderInfoDto
import com.mesaflow.client.core.network.dto.ServicePointOrderLineDto
import com.mesaflow.client.core.network.dto.ServicePointOrderResponseDto
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

    @Test
    fun `mapea el estado del punto de servicio con lineas conocidas`() {
        val dto = ServicePointOrderResponseDto(
            order = ServicePointOrderInfoDto(
                id = "order-1",
                tableId = "mesa-1",
                status = "sent_to_kitchen",
                totalCents = 1_880L,
                currency = "EUR",
            ),
            lines = listOf(
                ServicePointOrderLineDto(id = "line-1", productName = "Hamburguesa craft", quantity = 1, status = "preparing"),
                ServicePointOrderLineDto(id = "line-2", productName = "Agua mineral", quantity = 2, status = "ready"),
            ),
        )

        val status = dto.toServicePointOrderStatus()

        assertEquals("order-1", status.orderId)
        assertEquals("sent_to_kitchen", status.status)
        assertEquals(1_880L, status.totalCents)
        assertEquals("EUR", status.currency)
        assertEquals(2, status.lines.size)
        assertEquals("Hamburguesa craft", status.lines[0].productName)
        assertEquals(OrderLineKitchenStatus.PREPARING, status.lines[0].status)
        assertEquals(OrderLineKitchenStatus.READY, status.lines[1].status)
    }

    @Test
    fun `un estado de linea no reconocido mapea a UNKNOWN en vez de descartarse`() {
        val dto = ServicePointOrderResponseDto(
            order = ServicePointOrderInfoDto(id = "order-1", tableId = "mesa-1", status = "sent_to_kitchen"),
            lines = listOf(
                ServicePointOrderLineDto(id = "line-1", productName = "Postre nuevo", quantity = 1, status = "algo-futuro"),
            ),
        )

        val status = dto.toServicePointOrderStatus()

        assertEquals(OrderLineKitchenStatus.UNKNOWN, status.lines.single().status)
    }

    @Test
    fun `sin pedido abierto el estado mapea a null sin lineas`() {
        val status = ServicePointOrderResponseDto(order = null, lines = emptyList()).toServicePointOrderStatus()

        assertNull(status.orderId)
        assertNull(status.status)
        assertEquals(0L, status.totalCents)
        assertEquals("EUR", status.currency)
        assertTrue(status.lines.isEmpty())
    }
}
