package com.mesaflow.client

import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
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
 * cobro mock + registro real del pago contra el backend falso. La pantalla
 * de éxito es el ticket detallado: número de pedido, línea pedida, método
 * de pago y las dos salidas ("Seguir pidiendo" / "Salir de la mesa").
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
    fun pedirYPagar_muestraElTicketDePagoAceptado() {
        val activity = composeRule.activity

        llegaHastaElCobro()

        FakeBackend.enqueuePayment(server)
        composeRule.onNodeWithText(activity.getString(R.string.checkout_pay)).performClick()

        // La pasarela mock tiene un retardo simulado (~1.2s) antes de registrar el pago.
        composeRule.waitUntil(timeoutMillis = 8_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.checkout_accepted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Ticket detallado: número de pedido, línea pedida y método de pago usado.
        composeRule.onNodeWithText(
            activity.getString(R.string.checkout_ticket_number, FakeBackend.DAILY_NUMBER),
        ).assertExists()
        composeRule.onNodeWithText("1× ${FakeBackend.PRODUCT_NAME}").assertExists()
        composeRule.onNodeWithText(
            activity.getString(
                R.string.checkout_paid_with,
                activity.getString(R.string.checkout_method_card),
            ),
        ).assertExists()

        // Dos salidas: seguir pidiendo y salir de la mesa (pagado al completo).
        composeRule.onNodeWithText(activity.getString(R.string.checkout_keep_ordering)).assertExists()
        composeRule.onNodeWithText(activity.getString(R.string.settings_exit_table_button)).assertExists()
    }

    /**
     * Repite el mismo camino hasta llegar al cobro y cubre el error +
     * reintento: el primer registro de pago falla en el servidor (el pedido
     * no se marca como pagado — no hay cobro real, es mock), y el reintento
     * desde la acción del Snackbar sí lo registra.
     */
    @Test
    fun pagoFallaYReintentarLoRegistraConExito() {
        val activity = composeRule.activity

        llegaHastaElCobro()

        FakeBackend.enqueueServerError(server)
        composeRule.onNodeWithText(activity.getString(R.string.checkout_pay)).performClick()

        val serverErrorMessage = activity.getString(R.string.checkout_error_server)
        // Incluye el retardo de la pasarela mock (~1.2s) antes de llegar a la red.
        composeRule.waitUntil(timeoutMillis = 8_000) {
            composeRule.onAllNodesWithText(serverErrorMessage).fetchSemanticsNodes().isNotEmpty()
        }

        FakeBackend.enqueuePayment(server)
        composeRule.onNodeWithText(activity.getString(R.string.action_retry)).performClick()

        composeRule.waitUntil(timeoutMillis = 8_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.checkout_accepted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText(activity.getString(R.string.checkout_keep_ordering)).assertExists()
    }

    /**
     * Tras el pago, "Salir de la mesa" pide confirmación, hace logout y
     * devuelve a Entry con el stack limpio (misma salida que en Ajustes).
     */
    @Test
    fun pagarYSalirDeLaMesa_vuelveAEntry() {
        val activity = composeRule.activity

        llegaHastaElCobro()

        FakeBackend.enqueuePayment(server)
        composeRule.onNodeWithText(activity.getString(R.string.checkout_pay)).performClick()
        composeRule.waitUntil(timeoutMillis = 8_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.checkout_accepted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }

        FakeBackend.enqueueLogout(server)
        composeRule.onNodeWithText(activity.getString(R.string.settings_exit_table_button)).performClick()

        // Diálogo de confirmación compartido con Ajustes.
        composeRule.onNodeWithText(activity.getString(R.string.settings_exit_table_confirm_title))
            .assertExists()
        composeRule.onNodeWithText(activity.getString(R.string.settings_exit_table_confirm_button))
            .performClick()

        // Logout + stack vacío: vuelve a la pantalla de entrada.
        composeRule.waitUntil(timeoutMillis = 8_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.entry_demo_mode))
                .fetchSemanticsNodes().isNotEmpty()
        }
    }

    /**
     * Camino común de los tres tests: demo → carta → configurar → carrito →
     * enviar a cocina → "Ir a pagar", dejando la pantalla de cobro lista con
     * el botón Pagar visible. Cada test decide después cómo responde el
     * backend falso al registro del pago.
     */
    private fun llegaHastaElCobro() {
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
        composeRule.onNodeWithText(activity.getString(R.string.cart_submit)).performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.cart_submitted_title))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText(activity.getString(R.string.cart_go_to_checkout)).performClick()
        composeRule.onNodeWithText(activity.getString(R.string.checkout_pay)).assertExists()
    }
}
