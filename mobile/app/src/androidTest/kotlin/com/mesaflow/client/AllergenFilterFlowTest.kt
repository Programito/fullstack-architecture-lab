package com.mesaflow.client

import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.datastore.SessionStore
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Cubre el filtro de alergenos de la Carta de extremo a extremo (ver
 * [com.mesaflow.client.feature.menu.MenuFilter] y
 * [com.mesaflow.client.feature.menu.MenuScreen]) contra el **backend real**,
 * no un MockWebServer: usa `demo-login` + `GET /restaurants/:id/menu` tal
 * cual los expone `backend/`, y se apoya en dos productos ya presentes en el
 * seed de demo (`backend/prisma/seeds/mesaflow-demo.seed.ts`):
 * "Hamburguesa craft" (declara gluten, huevos, leche y mostaza) y
 * "Agua mineral" (sin alergenos declarados).
 *
 * ## Preparacion obligatoria antes de ejecutar este test
 *
 * 1. Backend arrancado en local con la base de datos migrada y sembrada:
 *    ```
 *    cd backend
 *    pnpm prisma:migrate
 *    pnpm prisma:seed
 *    pnpm start:dev
 *    ```
 *    (el seed es idempotente — `pnpm prisma:seed` se puede repetir sin
 *    duplicar datos; ver `seedMesaFlowDemo` en `mesaflow-demo.seed.ts`).
 * 2. Emulador/dispositivo con el puerto del backend reenviado, una vez por
 *    arranque del emulador (la debug build apunta a `127.0.0.1:3000`, ver
 *    `app/build.gradle.kts` y `mobile/README.md`):
 *    ```
 *    adb reverse tcp:3000 tcp:3000
 *    ```
 * 3. Ejecutar con el build type `debug` (el que trae ese `BASE_URL`):
 *    ```
 *    cd mobile
 *    ./gradlew.bat connectedDebugAndroidTest --tests "com.mesaflow.client.AllergenFilterFlowTest"
 *    ```
 *
 * Sin los tres pasos anteriores el test falla en el primer `waitUntil` con
 * timeout (no hay backend al otro lado de `127.0.0.1:3000`), no por un fallo
 * real de la app — si eso pasa, revisa el `adb reverse` y que el backend
 * este arriba antes de tocar el codigo de produccion.
 *
 * A diferencia de [DemoToOrderFlowTest]/[PaymentFlowTest] (que sí usan
 * [com.mesaflow.client.testutil.FakeBackend] porque cubren flujos de
 * escritura — pedidos y pagos — donde fijar la fixture es lo que hace el
 * test determinista), este flujo es de solo lectura sobre datos de catalogo:
 * usar el backend real con el seed de demo prueba, ademas de la UI, que el
 * campo `Product.allergens` viaja de verdad por Prisma → API → app.
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class AllergenFilterFlowTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Inject
    lateinit var sessionStore: SessionStore

    @Inject
    lateinit var cartRepository: CartRepository

    /** Debe coincidir con `EntryViewModel.DEMO_TABLE_ID` / el seed de layout. */
    private val demoRestaurantId = "restaurant-mesaflow-centro"

    @Before
    fun setUp() {
        hiltRule.inject()
        // Mismo motivo que en DemoToOrderFlowTest: sin limpiar, una sesion o
        // carrito de una ejecucion anterior en el mismo emulador dejaria el
        // test en un estado distinto al esperado.
        runBlocking {
            sessionStore.clear()
            cartRepository.clear(demoRestaurantId)
        }
    }

    /**
     * El buscador es un `OutlinedTextField`: antes de escribir, su texto
     * fusionado es el del placeholder ("Buscar en la carta"), y en cuanto
     * se escribe algo pasa a coincidir con el nombre de un producto — por
     * eso se localiza por `hasSetTextAction()` (es el único campo editable
     * de la pantalla) en vez de por texto, que dejaría de ser único.
     */
    private fun searchField() = composeRule.onNode(hasSetTextAction())

    @Test
    fun laCartaAvisaDeAlergenosYElFiltroOcultaSoloElProductoQueLosDeclara() {
        val activity = composeRule.activity
        val hamburguesaCraft = "Hamburguesa craft"
        val aguaMineral = "Agua mineral"

        composeRule.onNodeWithText(activity.getString(R.string.entry_demo_mode)).performClick()

        // Round-trip real (demo-login + carta) contra el backend: puede
        // tardar mas que contra un MockWebServer local.
        val searchHint = activity.getString(R.string.menu_search_hint)
        composeRule.waitUntil(timeoutMillis = 15_000) {
            composeRule.onAllNodesWithText(searchHint).fetchSemanticsNodes().isNotEmpty()
        }

        // Busca el producto con alergenos: evita depender de que el
        // LazyColumn haya compuesto esa fila (esta en la seccion
        // "Hamburguesas", no en la primera pantalla) y de paso comprueba
        // que buscador y filtro de alergenos conviven bien.
        searchField().performTextInput(hamburguesaCraft)
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithText(hamburguesaCraft).fetchSemanticsNodes().isNotEmpty()
        }

        val glutenLabel = activity.getString(R.string.allergen_gluten)
        val eggsLabel = activity.getString(R.string.allergen_eggs)
        val milkLabel = activity.getString(R.string.allergen_milk)
        val mustardLabel = activity.getString(R.string.allergen_mustard)
        val containsLabel = activity.getString(
            R.string.menu_contains_allergens,
            "$glutenLabel, $eggsLabel, $milkLabel, $mustardLabel",
        )
        composeRule.onNodeWithText(containsLabel).assertExists()

        // Marca "Gluten" como alergeno a evitar.
        composeRule.onNodeWithContentDescription(activity.getString(R.string.menu_allergen_filter_open))
            .performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.menu_allergen_filter_title))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText(glutenLabel).performClick()

        // Con la busqueda fija en "Hamburguesa craft" y gluten excluido, no
        // queda ningun resultado: la carta cae al estado vacio.
        val emptyResultsMessage = activity.getString(R.string.menu_empty_results)
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(emptyResultsMessage).fetchSemanticsNodes().isNotEmpty()
        }

        // Con el mismo alergeno excluido, un producto que no lo declara
        // (Agua mineral) sigue apareciendo: el filtro es por producto, no
        // global sobre toda la carta.
        searchField().performTextClearance()
        searchField().performTextInput(aguaMineral)
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(aguaMineral).fetchSemanticsNodes().isNotEmpty()
        }

        // Desmarcar el alergeno devuelve "Hamburguesa craft" a la lista: el
        // filtro solo oculta segun la seleccion actual, no descarta datos.
        searchField().performTextClearance()
        composeRule.onNodeWithContentDescription(activity.getString(R.string.menu_allergen_filter_open))
            .performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(activity.getString(R.string.menu_allergen_filter_title))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText(glutenLabel).performClick()
        searchField().performTextInput(hamburguesaCraft)
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText(hamburguesaCraft).fetchSemanticsNodes().isNotEmpty()
        }
    }
}
