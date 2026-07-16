package com.mesaflow.client

import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertCountEquals
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

    @Test
    fun pedidoEnviado_noMuestraElEstadoPreparingEnLaConfirmacion() {
        val activity = composeRule.activity
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
        FakeBackend.enqueueServicePointOrderStatus(server)
        composeRule.onNodeWithText(activity.getString(R.string.cart_submit)).performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.cart_submitted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.cart_kitchen_progress_title))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onAllNodesWithText(activity.getString(R.string.order_line_status_preparing))
            .assertCountEquals(0)
    }

    /**
     * Repite los mismos pasos que el test anterior hasta llegar al Carrito
     * (son hermanos, no una cadena — cada test es independiente) y cubre el
     * camino de error + reintento desde el Snackbar: el primer envío falla
     * en el servidor (openOrder devuelve 500), el carrito se conserva
     * (OrderRepository.submitCart solo lo vacía si TODO se confirma) y el
     * reintento con la acción del propio Snackbar sí completa el envío.
     */
    @Test
    fun enviarPedidoFallaYReintentarLoEnviaConExito() {
        val activity = composeRule.activity
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

        FakeBackend.enqueueServerError(server)
        composeRule.onNodeWithText(activity.getString(R.string.cart_submit)).performClick()

        val serverErrorMessage = activity.getString(R.string.cart_error_server)
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(serverErrorMessage).fetchSemanticsNodes().isNotEmpty()
        }

        FakeBackend.enqueueSubmitOrder(server)
        composeRule.onNodeWithText(activity.getString(R.string.action_retry)).performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.cart_submitted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText(activity.getString(R.string.cart_go_to_checkout)).assertExists()
    }

    /**
     * Volver a elegir mesa empieza un pedido nuevo: si el cliente sale de la
     * mesa con productos en el carrito sin llegar a pedir y vuelve a entrar
     * (aunque sea a la misma mesa demo), el carrito de la sesión anterior no
     * debe colarse en la carta de la mesa recién elegida (EntryViewModel.
     * signInAndEnter limpia CartRepository antes de guardar el nuevo contexto).
     */
    @Test
    fun volverAElegirMesaBorraElCarritoDeLaSesionAnterior() {
        val activity = composeRule.activity
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

        // El carrito tiene 1 producto: la barra flotante lo confirma.
        val cartFabLabel = activity.getString(R.string.cart_fab_label).substringBefore("%1")
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(cartFabLabel, substring = true).fetchSemanticsNodes().isNotEmpty()
        }

        // Sale de la mesa sin pedir: Ajustes -> "Salir de la mesa" -> confirmar.
        composeRule.onNodeWithContentDescription(activity.getString(R.string.settings_open)).performClick()
        composeRule.onNodeWithText(activity.getString(R.string.settings_exit_table_button)).performClick()
        composeRule.onNodeWithText(activity.getString(R.string.settings_exit_table_confirm_button)).performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.entry_demo_mode)).fetchSemanticsNodes().isNotEmpty()
        }

        // Vuelve a elegir mesa (modo demo de nuevo, misma mesa demo fija).
        FakeBackend.enqueueDemoLoginAndMenu(server)
        composeRule.onNodeWithText(activity.getString(R.string.entry_demo_mode)).performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(FakeBackend.PRODUCT_NAME).fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onAllNodesWithText(cartFabLabel, substring = true).assertCountEquals(0)
    }

    /**
     * Cubre el aviso persistente (CartRepository.hasFailedSubmission): el
     * envío falla, el cliente ignora el Snackbar y vuelve a la Carta con la
     * flecha de "Volver" en vez de reintentar ahí mismo — el banner debe
     * seguir visible, y reabrir el Carrito desde él debe permitir reintentar.
     */
    @Test
    fun pedidoFallidoMuestraAvisoEnLaCartaTrasVolverSinReintentar() {
        val activity = composeRule.activity
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

        FakeBackend.enqueueServerError(server)
        composeRule.onNodeWithText(activity.getString(R.string.cart_submit)).performClick()

        val serverErrorMessage = activity.getString(R.string.cart_error_server)
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(serverErrorMessage).fetchSemanticsNodes().isNotEmpty()
        }

        // Vuelve a la Carta sin tocar "Reintentar" en el Snackbar.
        composeRule.onNodeWithContentDescription(activity.getString(R.string.cart_back)).performClick()

        val pendingMessage = activity.getString(R.string.menu_pending_submission)
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(pendingMessage).fetchSemanticsNodes().isNotEmpty()
        }

        // El propio banner reabre el Carrito; esta vez el envío se completa.
        composeRule.onNodeWithText(pendingMessage).performClick()
        FakeBackend.enqueueSubmitOrder(server)
        composeRule.onNodeWithText(activity.getString(R.string.cart_submit)).performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.cart_submitted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }
    }
}

