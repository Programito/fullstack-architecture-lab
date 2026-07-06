package com.mesaflow.client.core.data

import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.database.CartDao
import com.mesaflow.client.core.database.CartLineEntity
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import com.mesaflow.client.core.network.OrdersApi
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.network.dto.AddOrderLineRequestDto
import com.mesaflow.client.core.network.dto.OpenOrderRequestDto
import com.mesaflow.client.core.network.dto.OrderResponseDto
import com.mesaflow.client.core.network.dto.OrderSummaryDto
import com.mesaflow.client.core.network.dto.RegisterPaymentRequestDto
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** DAO en memoria (compartido con CartRepositoryTest a nivel conceptual). */
private class InMemoryCartDao : CartDao {
    val lines = MutableStateFlow<List<CartLineEntity>>(emptyList())
    private var nextId = 1L

    override fun observeByRestaurant(restaurantId: String): Flow<List<CartLineEntity>> =
        lines.map { all -> all.filter { it.restaurantId == restaurantId } }

    override suspend fun findIdentical(
        restaurantId: String,
        menuItemId: String,
        selectionsJson: String,
    ): CartLineEntity? = null

    override suspend fun insert(line: CartLineEntity): Long {
        val id = nextId++
        lines.value += line.copy(id = id)
        return id
    }

    override suspend fun updateQuantity(id: Long, quantity: Int) = Unit

    override suspend fun delete(id: Long) {
        lines.value = lines.value.filterNot { it.id == id }
    }

    override suspend fun clear(restaurantId: String) {
        lines.value = lines.value.filterNot { it.restaurantId == restaurantId }
    }
}

private class FakeOrdersApi : OrdersApi {
    var openCalls = 0
    var addedLines = mutableListOf<AddOrderLineRequestDto>()
    var failOnLineIndex: Int? = null
    var totalCents = 0L

    override suspend fun openOrder(
        restaurantId: String,
        tableId: String,
        body: OpenOrderRequestDto,
    ): OrderResponseDto {
        openCalls++
        return response("order-1", "open")
    }

    override suspend fun addLine(
        restaurantId: String,
        orderId: String,
        body: AddOrderLineRequestDto,
    ): OrderResponseDto {
        if (failOnLineIndex == addedLines.size) throw IOException("network down")
        addedLines += body
        totalCents += 1000L * body.quantity
        return response(orderId, "open")
    }

    var kitchenCalls = mutableListOf<String>()
    var failOnSendToKitchen = false

    override suspend fun sendToKitchen(restaurantId: String, tableId: String) {
        if (failOnSendToKitchen) throw IOException("network down")
        kitchenCalls += tableId
    }

    var payments = mutableListOf<RegisterPaymentRequestDto>()

    override suspend fun registerPayment(
        restaurantId: String,
        orderId: String,
        body: RegisterPaymentRequestDto,
    ): OrderResponseDto {
        payments += body
        return OrderResponseDto(
            order = OrderSummaryDto(
                id = orderId,
                restaurantId = restaurantId,
                status = "paid",
                currency = "EUR",
                totalCents = totalCents,
                paidCents = body.amountCents,
                balanceCents = 0,
            ),
        )
    }

    private fun response(orderId: String, status: String) = OrderResponseDto(
        order = OrderSummaryDto(
            id = orderId,
            restaurantId = "rest-1",
            status = status,
            currency = "EUR",
            totalCents = totalCents,
        ),
    )
}

class OrderRepositoryTest {

    private val dao = InMemoryCartDao()
    private val cartRepository = CartRepository(dao, Json)
    private val api = FakeOrdersApi()
    private val repository = OrderRepository(api, cartRepository)

    private fun cartLine(menuItemId: String = "item-1", quantity: Int = 1) = CartLine(
        menuItemId = menuItemId,
        restaurantProductId = "prod-$menuItemId",
        name = "Producto $menuItemId",
        imageUrl = null,
        basePriceCents = 1000,
        currency = "EUR",
        quantity = quantity,
        selections = CartSelections(),
    )

    @Test
    fun `envia todas las lineas y vacia el carrito`() = runTest {
        cartRepository.add("rest-1", cartLine("item-1", quantity = 2))
        cartRepository.add("rest-1", cartLine("item-2"))
        val lines = cartRepository.cart("rest-1").first()

        val result = repository.submitCart("rest-1", "mesa-1", lines)

        assertTrue(result is AppResult.Success)
        assertEquals("order-1", (result as AppResult.Success).data.orderId)
        assertEquals(1, api.openCalls)
        assertEquals(2, api.addedLines.size)
        assertEquals(2, api.addedLines.first().quantity)
        assertEquals(listOf("mesa-1"), api.kitchenCalls)
        assertTrue(cartRepository.cart("rest-1").first().isEmpty())
    }

    @Test
    fun `si falla el envio a cocina el carrito se conserva para reintentar`() = runTest {
        cartRepository.add("rest-1", cartLine("item-1"))
        val lines = cartRepository.cart("rest-1").first()
        api.failOnSendToKitchen = true

        val result = repository.submitCart("rest-1", "mesa-1", lines)

        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Network, (result as AppResult.Error).error)
        assertEquals(1, cartRepository.cart("rest-1").first().size)
    }

    @Test
    fun `si falla una linea el carrito se conserva para reintentar`() = runTest {
        cartRepository.add("rest-1", cartLine("item-1"))
        cartRepository.add("rest-1", cartLine("item-2"))
        val lines = cartRepository.cart("rest-1").first()
        api.failOnLineIndex = 1 // la segunda línea revienta

        val result = repository.submitCart("rest-1", "mesa-1", lines)

        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Network, (result as AppResult.Error).error)
        assertEquals(2, cartRepository.cart("rest-1").first().size)
    }

    @Test
    fun `carrito vacio es error de validacion sin llamar a la red`() = runTest {
        val result = repository.submitCart("rest-1", "mesa-1", emptyList())
        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Validation, (result as AppResult.Error).error)
        assertEquals(0, api.openCalls)
    }

    @Test
    fun `pagar registra el metodo y el importe en el backend`() = runTest {
        val result = repository.pay("rest-1", "order-1", 2500, PaymentMethod.BIZUM)

        assertTrue(result is AppResult.Success)
        val payment = (result as AppResult.Success).data
        assertEquals("paid", payment.status)
        assertEquals(2500, payment.paidCents)
        assertEquals(0, payment.balanceCents)
        assertEquals("bizum", api.payments.single().method)
        assertEquals(2500, api.payments.single().amountCents)
    }

    @Test
    fun `pagar un importe no positivo es error de validacion sin llamar a la red`() = runTest {
        val result = repository.pay("rest-1", "order-1", 0, PaymentMethod.CARD)
        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Validation, (result as AppResult.Error).error)
        assertTrue(api.payments.isEmpty())
    }

    @Test
    fun `linea sin restaurantProductId es error de validacion antes de enviar nada`() = runTest {
        val invalid = cartLine("item-1").copy(restaurantProductId = null)
        val result = repository.submitCart("rest-1", "mesa-1", listOf(invalid))
        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Validation, (result as AppResult.Error).error)
        assertEquals(0, api.openCalls)
    }
}
