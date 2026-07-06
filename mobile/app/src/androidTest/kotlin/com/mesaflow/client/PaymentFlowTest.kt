package com.mesaflow.client

import androidx.compose.ui.test.assertExists
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.network.di.NetworkConfig
import com.mesaflow.client.testutil.FakeBackend
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Flujo crítico 2 (Fase 8, item 4): pedir → pagar → aceptado. Repite los
 * mismos pasos que [DemoToOrderFlowTest] hasta "pedido enviado" (son
 * hermanos, no una cadena — cada test es independiente) y continúa hacia el
 * cobro mock + registro real del pago contra el backend falso.
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class PaymentFlowTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Inject
    lateinit var sessionStore: SessionStore

    @Inject
    lateinit var cartRepository: CartRepository

    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        hiltRule.inject()
        server = FakeBackend.start()
        NetworkConfig.baseUrlOverride = server.url("/api/v1/").toString()
        runBlocking {
            sessionStore.clear()
            cartRepository.clear(FakeBackend.RESTAURANT_ID)
        }
    }

    @After
    fun tearDown() {
        server.shutdown()
        NetworkConfig.baseUrlOverride = null
    }

    @Test
    fun pedirYPagar_llegaAPantallaDePagoAceptado() {
        val activity = composeRule.activity

        // --- Repite el flujo 1 hasta "pedido enviado" ---
        FakeBackend.enqueueDemoLoginAndMenu(server)
        composeRule.onNodeWithText(activity.getString(R.string.entry_demo_mode)).performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(FakeBackend.PRODUCT_NAME).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText(FakeBackend.PRODUCT_NAME).performClick()

        val addLabel = activity.getString(R.string.configurator_add_for).substringBefore("%1")
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(addLabel, substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onAllNodesWithText(addLabel, substring = true)[0].performClick()

        val cartFabLabel = activity.getString(R.string.cart_fab_label).substringBefore("%1")
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(cartFabLabel, substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onAllNodesWithText(cartFabLabel, substring = true)[0].performClick()

        FakeBackend.enqueueSubmitOrder(server)
        composeRule.onNodeWithText(activity.getString(R.string.cart_submit)).performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.cart_submitted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // --- Continúa hacia el cobro ---
        composeRule.onNodeWithText(activity.getString(R.string.cart_go_to_checkout)).performClick()
        composeRule.onNodeWithText(activity.getString(R.string.checkout_pay)).assertExists()

        FakeBackend.enqueuePayment(server)
        composeRule.onNodeWithText(activity.getString(R.string.checkout_pay)).performClick()

        // La pasarela mock tiene un retardo simulado (~1.2s) antes de registrar el pago.
        composeRule.waitUntil(timeoutMillis = 8_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.checkout_accepted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText(activity.getString(R.string.checkout_done)).assertExists()
    }
}
