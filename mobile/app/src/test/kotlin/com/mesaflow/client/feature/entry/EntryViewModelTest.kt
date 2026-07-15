package com.mesaflow.client.feature.entry

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import com.mesaflow.client.core.data.AuthRepository
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.data.OrderRepository
import com.mesaflow.client.core.data.PlatformReadinessRepository
import com.mesaflow.client.core.database.CartDao
import com.mesaflow.client.core.database.CartLineEntity
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.network.AuthApi
import com.mesaflow.client.core.network.HealthApi
import com.mesaflow.client.core.network.OrdersApi
import com.mesaflow.client.core.network.SessionCookieJar
import com.mesaflow.client.core.network.TokenHolder
import com.mesaflow.client.core.network.dto.AuthResponseDto
import com.mesaflow.client.core.network.dto.DemoLoginRequestDto
import com.mesaflow.client.core.network.dto.LoginRequestDto
import com.mesaflow.client.core.network.dto.PublicConfigDto
import com.mesaflow.client.core.network.dto.ReadinessDto
import com.mesaflow.client.core.network.dto.ScopesDto
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
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class EntryViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    private lateinit var scope: CoroutineScope
    private lateinit var tmpFile: File
    private lateinit var sessionStore: SessionStore
    private lateinit var cartRepository: CartRepository
    private lateinit var authApi: FakeAuthApi
    private lateinit var ordersApi: FakeOrdersApi

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        scope = CoroutineScope(dispatcher + SupervisorJob())
        tmpFile = File.createTempFile("entry-viewmodel", ".preferences_pb").also { it.delete() }
        val dataStore = PreferenceDataStoreFactory.create(scope = scope, produceFile = { tmpFile })
        sessionStore = SessionStore(dataStore)
        cartRepository = CartRepository(InMemoryCartDao(), Json)
        authApi = FakeAuthApi()
        ordersApi = FakeOrdersApi()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        scope.cancel()
        tmpFile.delete()
    }

    @Test
    fun `demo mode frees the table before navigating to menu`() = runTest(dispatcher) {
        val viewModel = createViewModel()

        advanceUntilIdle()
        viewModel.onDemoModeClick()
        advanceUntilIdle()

        assertEquals(listOf("restaurant-demo" to DEMO_TABLE_ID), ordersApi.freedTables)
        assertEquals("restaurant-demo", sessionStore.tableContext.first()?.restaurantId)
        assertEquals(DEMO_TABLE_ID, sessionStore.tableContext.first()?.tableId)
        assertNull(viewModel.uiState.value.error)
        assertTrue(!viewModel.uiState.value.isLoading)
    }

    @Test
    fun `demo mode surfaces a network error when freeing the table fails`() = runTest(dispatcher) {
        ordersApi.failOnFree = true
        val viewModel = createViewModel()

        advanceUntilIdle()
        viewModel.onDemoModeClick()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.error == EntryError.NETWORK)
        assertNull(sessionStore.tableContext.first())
    }

    private fun createViewModel(): EntryViewModel {
        val authRepository = AuthRepository(
            authApi = authApi,
            sessionStore = sessionStore,
            tokenHolder = TokenHolder(),
            cookieJar = SessionCookieJar(),
            baseUrl = "https://mesaflow.test/api/v1/",
        )
        val orderRepository = OrderRepository(ordersApi, cartRepository)
        val readinessRepository = PlatformReadinessRepository(FakeHealthApi())
        return EntryViewModel(
            authRepository = authRepository,
            sessionStore = sessionStore,
            platformReadinessRepository = readinessRepository,
            cartRepository = cartRepository,
            orderRepository = orderRepository,
        )
    }
}

private class FakeAuthApi : AuthApi {
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

    override suspend fun logout() = Unit
}

private class FakeHealthApi : HealthApi {
    override suspend fun readiness(): ReadinessDto =
        ReadinessDto(status = "ready", database = "ready", durationMs = 1)
}

private class FakeOrdersApi : OrdersApi {
    val freedTables = mutableListOf<Pair<String, String>>()
    var failOnFree = false

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
        body: com.mesaflow.client.core.network.dto.RegisterPaymentRequestDto,
    ) = error("unused")

    override suspend fun freeServicePoint(restaurantId: String, tableId: String) {
        if (failOnFree) throw java.io.IOException("network down")
        freedTables += restaurantId to tableId
    }

    override suspend fun getServicePointOrder(
        restaurantId: String,
        tableId: String,
    ) = error("unused")
}

private class InMemoryCartDao : CartDao {
    private val lines = MutableStateFlow<List<CartLineEntity>>(emptyList())

    override fun observeByRestaurant(restaurantId: String): Flow<List<CartLineEntity>> =
        lines.map { all -> all.filter { it.restaurantId == restaurantId } }

    override suspend fun findIdentical(
        restaurantId: String,
        menuItemId: String,
        selectionsJson: String,
    ): CartLineEntity? = null

    override suspend fun findIdenticalExcluding(
        restaurantId: String,
        menuItemId: String,
        selectionsJson: String,
        excludeId: Long,
    ): CartLineEntity? = null

    override suspend fun insert(line: CartLineEntity): Long = 1L

    override suspend fun updateQuantity(id: Long, quantity: Int) = Unit

    override suspend fun updateLineDetails(
        id: Long,
        name: String,
        imageUrl: String?,
        basePriceCents: Long,
        currency: String,
        selectionsJson: String,
        quantity: Int,
    ) = Unit

    override suspend fun delete(id: Long) = Unit

    override suspend fun clear(restaurantId: String) {
        lines.value = lines.value.filterNot { it.restaurantId == restaurantId }
    }
}
