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
 * Flujo crítico 1 (Fase 8, item 4): demo → carta → configurar producto →
 * pedir. El backend real se sustituye por un MockWebServer (ver
 * [FakeBackend]); Room y DataStore son los reales del dispositivo/emulador,
 * por eso cada test limpia su propio estado en [setUp].
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class DemoToOrderFlowTest {

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
        // Estado limpio: sin esto, una sesión o carrito de una ejecución
        // anterior en el mismo emulador dejaría el test en un estado distinto
        // al que espera (p.ej. saltarse Entry o duplicar líneas del carrito).
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
    fun demoLogin_configurarProducto_pedirLlegaAPantallaDeConfirmacion() {
        val activity = composeRule.activity
        FakeBackend.enqueueDemoLoginAndMenu(server)

        composeRule.onNodeWithText(activity.getString(R.string.entry_demo_mode)).performClick()

        // La carta tarda un round-trip (demo-login + menu) en aparecer.
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(FakeBackend.PRODUCT_NAME).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText(FakeBackend.PRODUCT_NAME).performClick()

        // El producto de la fixture no tiene extras/combo obligatorios: el
        // botón de añadir ya está habilitado en cuanto se abre el configurador.
        val addLabel = activity.getString(R.string.configurator_add_for).substringBefore("%1")
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(addLabel, substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onAllNodesWithText(addLabel, substring = true)[0].performClick()

        // De vuelta en la carta, la barra de carrito flotante confirma el añadido.
        val cartFabLabel = activity.getString(R.string.cart_fab_label).substringBefore("%1")
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(cartFabLabel, substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onAllNodesWithText(cartFabLabel, substring = true)[0].performClick()

        composeRule.onNodeWithText(activity.getString(R.string.cart_submit)).assertExists()

        FakeBackend.enqueueSubmitOrder(server)
        composeRule.onNodeWithText(activity.getString(R.string.cart_submit)).performClick()

        // submitCart() encadena abrir pedido + línea + disparo a cocina.
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.cart_submitted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText(activity.getString(R.string.cart_go_to_checkout)).assertExists()
    }
}
