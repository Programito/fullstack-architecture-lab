package com.mesaflow.client.core.data

import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.database.CartDao
import com.mesaflow.client.core.database.CartLineEntity
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import com.mesaflow.client.core.model.OrderLineKitchenStatus
import com.mesaflow.client.core.network.OrdersApi
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.network.dto.AddOrderLineRequestDto
import com.mesaflow.client.core.network.dto.OrderLineComboSlotDto
import com.mesaflow.client.core.network.dto.OrderLineDto
import com.mesaflow.client.core.network.dto.OrderLineModifierDto
import com.mesaflow.client.core.network.dto.OrderLinePlatterComponentDto
import com.mesaflow.client.core.network.dto.OpenOrderRequestDto
import com.mesaflow.client.core.network.dto.OrderResponseDto
import com.mesaflow.client.core.network.dto.OrderSummaryDto
import com.mesaflow.client.core.network.dto.RegisterPaymentRequestDto
import com.mesaflow.client.core.network.dto.ServicePointOrderInfoDto
import com.mesaflow.client.core.network.dto.ServicePointOrderLineDto
import com.mesaflow.client.core.network.dto.ServicePointOrderResponseDto
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
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
            lines = listOf(
                OrderLineDto(
                    id = "line-1",
                    restaurantProductId = "prod-item-1",
                    productName = "Coca-Cola",
                    quantity = 1,
                    subtotalCents = 320,
                    modifiers = listOf(OrderLineModifierDto(optionName = "Mediana")),
                ),
                OrderLineDto(
                    id = "line-2",
                    restaurantProductId = "prod-item-2",
                    productName = "Plato combinado de lomo",
                    quantity = 1,
                    subtotalCents = 1490,
                    comboSlots = listOf(OrderLineComboSlotDto(selectedProductName = "Huevo extra")),
                    platterComponents = listOf(OrderLinePlatterComponentDto(componentName = "Salsa", removed = true)),
                ),
            ),
        )
    }

    var servicePointOrderCalls = mutableListOf<Pair<String, String>>()
    var servicePointOrderResponse = ServicePointOrderResponseDto()
    var failOnGetServicePointOrder = false

    override suspend fun getServicePointOrder(restaurantId: String, tableId: String): ServicePointOrderResponseDto {
        if (failOnGetServicePointOrder) throw IOException("network down")
        servicePointOrderCalls += restaurantId to tableId
        return servicePointOrderResponse
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
    fun `prepara todas las lineas y vacia el carrito sin enviarlo aun a cocina`() = runTest {
        cartRepository.add("rest-1", cartLine("item-1", quantity = 2))
        cartRepository.add("rest-1", cartLine("item-2"))
        val lines = cartRepository.cart("rest-1").first()

        val result = repository.submitCart("rest-1", "mesa-1", lines)

        assertTrue(result is AppResult.Success)
        assertEquals("order-1", (result as AppResult.Success).data.orderId)
        assertEquals(1, api.openCalls)
        assertEquals(2, api.addedLines.size)
        assertEquals(2, api.addedLines.first().quantity)
        assertTrue(api.kitchenCalls.isEmpty())
        assertTrue(cartRepository.cart("rest-1").first().isEmpty())
        assertFalse(cartRepository.hasFailedSubmission("rest-1").first())
    }

    @Test
    fun `un envio exitoso limpia el aviso de un fallo previo`() = runTest {
        cartRepository.add("rest-1", cartLine("item-1"))
        val lines = cartRepository.cart("rest-1").first()
        // Simula que un intento anterior ya había marcado el aviso.
        cartRepository.markSubmissionFailed("rest-1")

        val result = repository.submitCart("rest-1", "mesa-1", lines)

        assertTrue(result is AppResult.Success)
        assertFalse(cartRepository.hasFailedSubmission("rest-1").first())
    }

    @Test
    fun `submitCart no intenta enviar a cocina todavia`() = runTest {
        cartRepository.add("rest-1", cartLine("item-1"))
        val lines = cartRepository.cart("rest-1").first()
        api.failOnSendToKitchen = true

        val result = repository.submitCart("rest-1", "mesa-1", lines)

        assertTrue(result is AppResult.Success)
        assertTrue(api.kitchenCalls.isEmpty())
        assertTrue(cartRepository.cart("rest-1").first().isEmpty())
        assertFalse(cartRepository.hasFailedSubmission("rest-1").first())
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
        assertTrue(cartRepository.hasFailedSubmission("rest-1").first())
    }

    @Test
    fun `carrito vacio es error de validacion sin llamar a la red`() = runTest {
        val result = repository.submitCart("rest-1", "mesa-1", emptyList())
        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Validation, (result as AppResult.Error).error)
        assertEquals(0, api.openCalls)
        assertFalse(cartRepository.hasFailedSubmission("rest-1").first())
    }

    @Test
    fun `pagar registra el metodo y el importe en el backend`() = runTest {
        val result = repository.pay("rest-1", "order-1", 2500, PaymentMethod.BIZUM)

        assertTrue(result is AppResult.Success)
        val payment = (result as AppResult.Success).data
        assertEquals("paid", payment.status)
        assertEquals(2500, payment.paidCents)
        assertEquals(0, payment.balanceCents)
        assertEquals(2, payment.lines.size)
        assertEquals(320, payment.lines[0].totalCents)
        assertEquals("Mediana", payment.lines[0].selections.modifiers.single().optionName)
        assertEquals("Huevo extra", payment.lines[1].selections.comboOptions.single().optionName)
        assertEquals("Salsa", payment.lines[1].selections.removedComponents.single().name)
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
    fun `el estado del punto de servicio mapea las lineas con su estado de cocina`() = runTest {
        api.servicePointOrderResponse = ServicePointOrderResponseDto(
            order = ServicePointOrderInfoDto(id = "order-1", tableId = "mesa-1", status = "sent_to_kitchen"),
            lines = listOf(
                ServicePointOrderLineDto(id = "line-1", productName = "Hamburguesa craft", quantity = 1, status = "preparing"),
                ServicePointOrderLineDto(id = "line-2", productName = "Agua mineral", quantity = 2, status = "ready"),
            ),
        )

        val result = repository.getServicePointOrder("rest-1", "mesa-1")

        assertTrue(result is AppResult.Success)
        val status = (result as AppResult.Success).data
        assertEquals("order-1", status.orderId)
        assertEquals("sent_to_kitchen", status.status)
        assertEquals(2, status.lines.size)
        assertEquals(OrderLineKitchenStatus.PREPARING, status.lines[0].status)
        assertEquals(OrderLineKitchenStatus.READY, status.lines[1].status)
        assertEquals(listOf("rest-1" to "mesa-1"), api.servicePointOrderCalls)
    }

    @Test
    fun `sin pedido abierto el estado llega con order nulo`() = runTest {
        api.servicePointOrderResponse = ServicePointOrderResponseDto(order = null, lines = emptyList())

        val result = repository.getServicePointOrder("rest-1", "mesa-1")

        assertTrue(result is AppResult.Success)
        val status = (result as AppResult.Success).data
        assertNull(status.orderId)
        assertNull(status.status)
        assertTrue(status.lines.isEmpty())
    }

    @Test
    fun `un fallo de red al consultar el estado se propaga como error`() = runTest {
        api.failOnGetServicePointOrder = true

        val result = repository.getServicePointOrder("rest-1", "mesa-1")

        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Network, (result as AppResult.Error).error)
    }
}
