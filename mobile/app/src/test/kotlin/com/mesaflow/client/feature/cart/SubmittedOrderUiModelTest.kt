package com.mesaflow.client.feature.cart

import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import com.mesaflow.client.core.model.OrderLineKitchenStatus
import com.mesaflow.client.core.model.ServicePointOrderLine
import com.mesaflow.client.core.model.SubmittedOrder
import org.junit.Assert.assertEquals
import org.junit.Test

class SubmittedOrderUiModelTest {

    @Test
    fun `uses submitted cart total as primary amount when submitted lines exist`() {
        val submittedLines = listOf(
            cartLine(id = 1, name = "Classic Burger", quantity = 2, basePriceCents = 1_150),
            cartLine(id = 2, name = "Coca-Cola", quantity = 1, basePriceCents = 320),
        )

        assertEquals(2_620L, submittedOrderPrimaryTotalCents(submittedLines, fallbackTotalCents = 6_420L))
    }

    @Test
    fun `falls back to backend total when submitted lines snapshot is empty`() {
        assertEquals(6_420L, submittedOrderPrimaryTotalCents(emptyList(), fallbackTotalCents = 6_420L))
    }

    @Test
    fun `adds the active table total to the new cart lines when calculating payable amount`() {
        val liveLines = listOf(
            cartLine(id = 1, name = "Coca-Cola", quantity = 2, basePriceCents = 320),
            cartLine(id = 2, name = "Patatas", quantity = 1, basePriceCents = 240),
        )

        assertEquals(1_880L, cartPayableTotalCents(liveLines, activeTableTotalCents = 1_000L))
    }

    @Test
    fun `uses only the new cart lines when there is no active table total`() {
        val liveLines = listOf(
            cartLine(id = 1, name = "Coca-Cola", quantity = 2, basePriceCents = 320),
        )

        assertEquals(640L, cartPayableTotalCents(liveLines, activeTableTotalCents = 0L))
    }

    @Test
    fun `filters kitchen progress to only newly submitted quantities`() {
        val submittedLines = listOf(
            cartLine(id = 1, name = "Classic Burger", quantity = 1, basePriceCents = 1_150),
            cartLine(id = 2, name = "Coca-Cola", quantity = 2, basePriceCents = 320),
        )
        val polledLines = listOf(
            ServicePointOrderLine(
                id = "old-burger",
                productName = "Classic Burger",
                quantity = 3,
                status = OrderLineKitchenStatus.PREPARING,
            ),
            ServicePointOrderLine(
                id = "new-coke",
                productName = "Coca-Cola",
                quantity = 2,
                status = OrderLineKitchenStatus.PREPARING,
            ),
            ServicePointOrderLine(
                id = "water",
                productName = "Water",
                quantity = 1,
                status = OrderLineKitchenStatus.PREPARING,
            ),
        )

        assertEquals(
            listOf(
                ServicePointOrderLine(
                    id = "old-burger",
                    productName = "Classic Burger",
                    quantity = 1,
                    status = OrderLineKitchenStatus.PREPARING,
                ),
                ServicePointOrderLine(
                    id = "new-coke",
                    productName = "Coca-Cola",
                    quantity = 2,
                    status = OrderLineKitchenStatus.PREPARING,
                ),
            ),
            filterSubmittedProgressLines(polledLines, submittedLines),
        )
    }

    @Test
    fun `reopening a cart with live lines clears previous submitted state`() {
        val previousState = CartUiState(
            submitted = SubmittedOrder(
                orderId = "order-1",
                status = "OPEN",
                dailyNumber = 12,
                subtotalCents = 6_420L,
                taxCents = 0L,
                totalCents = 6_420L,
                currency = "EUR",
            ),
            submittedLines = listOf(cartLine(id = 9, name = "Old Burger", quantity = 1, basePriceCents = 1_150)),
            tableLabel = "table-1",
        )

        val reconciled = reconcileCartUiStateWithLines(
            uiState = previousState,
            liveLines = listOf(cartLine(id = 1, name = "New Coke", quantity = 1, basePriceCents = 320)),
        )

        assertEquals(null, reconciled.submitted)
        assertEquals(emptyList<CartLine>(), reconciled.submittedLines)
        assertEquals("", reconciled.tableLabel)
    }

    @Test
    fun `submitted state remains while cart is still empty`() {
        val previousState = CartUiState(
            submitted = SubmittedOrder(
                orderId = "order-1",
                status = "OPEN",
                dailyNumber = 12,
                subtotalCents = 6_420L,
                taxCents = 0L,
                totalCents = 6_420L,
                currency = "EUR",
            ),
            tableLabel = "table-1",
        )

        assertEquals(previousState, reconcileCartUiStateWithLines(previousState, emptyList()))
    }

    private fun cartLine(id: Long, name: String, quantity: Int, basePriceCents: Long): CartLine = CartLine(
        id = id,
        menuItemId = "item-$id",
        restaurantProductId = "rp-$id",
        name = name,
        imageUrl = null,
        basePriceCents = basePriceCents,
        currency = "EUR",
        quantity = quantity,
        selections = CartSelections(),
    )
}
