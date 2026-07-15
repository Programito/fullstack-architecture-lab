package com.mesaflow.client.feature.checkout

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import com.mesaflow.client.core.data.AuthRepository
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.data.OrderRepository
import com.mesaflow.client.core.database.CartDao
import com.mesaflow.client.core.database.CartLineEntity
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.TableContext
import com.mesaflow.client.core.network.AuthApi
import com.mesaflow.client.core.network.OrdersApi
import com.mesaflow.client.core.network.SessionCookieJar
import com.mesaflow.client.core.network.TokenHolder
import com.mesaflow.client.core.network.dto.AuthResponseDto
import com.mesaflow.client.core.network.dto.DemoLoginRequestDto
import com.mesaflow.client.core.network.dto.LoginRequestDto
import com.mesaflow.client.core.network.dto.OrderLineDto
import com.mesaflow.client.core.network.dto.OrderResponseDto
import com.mesaflow.client.core.network.dto.OrderSummaryDto
import com.mesaflow.client.core.network.dto.PublicConfigDto
import com.mesaflow.client.core.network.dto.RegisterPaymentRequestDto
import com.mesaflow.client.core.network.dto.ScopesDto
import com.mesaflow.client.core.network.dto.ServicePointOrderResponseDto
import com.mesaflow.client.core.network.dto.UserDto
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CheckoutViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    private lateinit var scope: CoroutineScope
    private lateinit var tmpFile: File
    private lateinit var sessionStore: SessionStore
    private lateinit var ordersApi: FakeCheckoutOrdersApi
    private lateinit var authApi: FakeCheckoutAuthApi
    private lateinit var cartDao: InMemoryCheckoutCartDao

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        scope = CoroutineScope(dispatcher + SupervisorJob())
        tmpFile = File.createTempFile("checkout-viewmodel", ".preferences_pb").also { it.delete() }
        val dataStore = PreferenceDataStoreFactory.create(scope = scope, produceFile = { tmpFile })
        sessionStore = SessionStore(dataStore)
        ordersApi = FakeCheckoutOrdersApi()
        authApi = FakeCheckoutAuthApi()
        cartDao = InMemoryCheckoutCartDao()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        scope.cancel()
        tmpFile.delete()
    }

    @Test
    fun `keep ordering after a successful payment frees the table without restoring the previous cart`() = runTest(dispatcher) {
        val viewModel = createViewModel()
        sessionStore.saveTableContext(TableContext(restaurantId = "restaurant-demo", tableId = "table-1"))
        viewModel.onPay(orderId = "order-1", amountCents = 400)
        advanceTimeBy(1_200L)
        advanceUntilIdle()

        viewModel.onKeepOrderingRequested()
        advanceUntilIdle()

        assertEquals(listOf("restaurant-demo" to "table-1"), ordersApi.freedTables)
        val cart = createCartRepository().cart("restaurant-demo").first()
        assertEquals(emptyList<CartLine>(), cart)
        assertEquals(false, viewModel.uiState.value.isProcessing)
    }

    @Test
    fun `returning to cart before paying restores the submitted lines and frees the draft order`() = runTest(dispatcher) {
        val cartRepository = createCartRepository()
        val viewModel = createViewModel(cartRepository)
        sessionStore.saveTableContext(TableContext(restaurantId = "restaurant-demo", tableId = "table-1"))

        viewModel.onReturnToCartRequested(
            lines = listOf(
                CartLine(
                    menuItemId = "product-1",
                    restaurantProductId = "product-1",
                    name = "Coca-Cola",
                    imageUrl = null,
                    basePriceCents = 400,
                    currency = "EUR",
                    quantity = 1,
                    selections = CartSelections(),
                ),
            ),
        )
        advanceUntilIdle()

        assertEquals(listOf("restaurant-demo" to "table-1"), ordersApi.freedTables)
        val cart = cartRepository.cart("restaurant-demo").first()
        assertEquals(1, cart.size)
        assertEquals("product-1", cart.single().menuItemId)
        assertEquals(1, cart.single().quantity)
        assertEquals(false, viewModel.uiState.value.isProcessing)
    }

    @Test
    fun `exit table frees the table before logout`() = runTest(dispatcher) {
        val viewModel = createViewModel()
        sessionStore.saveTableContext(TableContext(restaurantId = "restaurant-demo", tableId = "table-1"))

        viewModel.onExitTableRequested()
        advanceUntilIdle()

        assertEquals(listOf("restaurant-demo" to "table-1"), ordersApi.freedTables)
        assertEquals(1, authApi.logoutCalls)
        assertNull(sessionStore.tableContext.first())
    }

    private fun createViewModel(
        cartRepository: CartRepository = createCartRepository(),
    ): CheckoutViewModel {
        val authRepository = AuthRepository(
            authApi = authApi,
            sessionStore = sessionStore,
            tokenHolder = TokenHolder(),
            cookieJar = SessionCookieJar(),
            baseUrl = "https://mesaflow.test/api/v1/",
        )
        val orderRepository = OrderRepository(ordersApi, cartRepository)
        return CheckoutViewModel(
            cartRepository = cartRepository,
            orderRepository = orderRepository,
            sessionStore = sessionStore,
            authRepository = authRepository,
        )
    }

    private fun createCartRepository(): CartRepository = CartRepository(cartDao, Json)
}

private class FakeCheckoutAuthApi : AuthApi {
    var logoutCalls = 0

    override suspend fun login(body: LoginRequestDto): AuthResponseDto = error("unused")

    override suspend fun demoLogin(body: DemoLoginRequestDto): AuthResponseDto =
        AuthResponseDto(
            accessToken = "token-demo",
            user = UserDto(id = "user-1", email = "demo@mesaflow.test"),
            permissions = listOf("service"),
            roles = listOf("customer"),
            scopes = ScopesDto(restaurants = listOf("restaurant-demo")),
        )

    override suspend fun publicConfig(): PublicConfigDto = PublicConfigDto()

    override suspend fun logout() {
        logoutCalls += 1
    }
}

private class FakeCheckoutOrdersApi : OrdersApi {
    val freedTables = mutableListOf<Pair<String, String>>()

    override suspend fun openOrder(
        restaurantId: String,
        tableId: String,
        body: com.mesaflow.client.core.network.dto.OpenOrderRequestDto,
    ) = error("unused")

    override suspend fun addLine(
        restaurantId: String,
        orderId: String,
        body: com.mesaflow.client.core.network.dto.AddOrderLineRequestDto,
    ) = error("unused")

    override suspend fun sendToKitchen(restaurantId: String, tableId: String) = Unit

    override suspend fun registerPayment(
        restaurantId: String,
        orderId: String,
        body: RegisterPaymentRequestDto,
    ): OrderResponseDto =
        OrderResponseDto(
            order = OrderSummaryDto(
                id = orderId,
                restaurantId = restaurantId,
                status = "paid",
                currency = "EUR",
                totalCents = body.amountCents,
                paidCents = body.amountCents,
                balanceCents = 0,
            ),
            lines = listOf(
                OrderLineDto(
                    id = "line-1",
                    restaurantProductId = "product-1",
                    productId = "product-1",
                    basePriceCents = body.amountCents,
                    productName = "Coca-Cola",
                    quantity = 1,
                    subtotalCents = body.amountCents,
                ),
            ),
        )

    override suspend fun freeServicePoint(restaurantId: String, tableId: String) {
        freedTables += restaurantId to tableId
    }

    override suspend fun getServicePointOrder(
        restaurantId: String,
        tableId: String,
    ): ServicePointOrderResponseDto = ServicePointOrderResponseDto()
}

private class InMemoryCheckoutCartDao : CartDao {
    private val lines = MutableStateFlow<List<CartLineEntity>>(emptyList())
    private var nextId = 1L

    override fun observeByRestaurant(restaurantId: String): Flow<List<CartLineEntity>> =
        lines.map { all -> all.filter { it.restaurantId == restaurantId } }

    override suspend fun findIdentical(
        restaurantId: String,
        menuItemId: String,
        selectionsJson: String,
    ): CartLineEntity? = lines.value.firstOrNull {
        it.restaurantId == restaurantId && it.menuItemId == menuItemId && it.selectionsJson == selectionsJson
    }

    override suspend fun findIdenticalExcluding(
        restaurantId: String,
        menuItemId: String,
        selectionsJson: String,
        excludeId: Long,
    ): CartLineEntity? = lines.value.firstOrNull {
        it.restaurantId == restaurantId &&
            it.menuItemId == menuItemId &&
            it.selectionsJson == selectionsJson &&
            it.id != excludeId
    }

    override suspend fun insert(line: CartLineEntity): Long {
        val id = nextId++
        lines.value += line.copy(id = id)
        return id
    }

    override suspend fun updateQuantity(id: Long, quantity: Int) {
        lines.value = lines.value.map { if (it.id == id) it.copy(quantity = quantity) else it }
    }

    override suspend fun updateLineDetails(
        id: Long,
        name: String,
        imageUrl: String?,
        basePriceCents: Long,
        currency: String,
        selectionsJson: String,
        quantity: Int,
    ) {
        lines.value = lines.value.map {
            if (it.id == id) {
                it.copy(
                    name = name,
                    imageUrl = imageUrl,
                    basePriceCents = basePriceCents,
                    currency = currency,
                    selectionsJson = selectionsJson,
                    quantity = quantity,
                )
            } else {
                it
            }
        }
    }

    override suspend fun delete(id: Long) {
        lines.value = lines.value.filterNot { it.id == id }
    }

    override suspend fun clear(restaurantId: String) {
        lines.value = lines.value.filterNot { it.restaurantId == restaurantId }
    }
}
