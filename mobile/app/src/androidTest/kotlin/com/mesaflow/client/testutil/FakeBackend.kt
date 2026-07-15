package com.mesaflow.client.testutil

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer

/**
 * Fixtures del backend para los tests instrumentados de extremo a extremo.
 * En vez de un [okhttp3.mockwebserver.Dispatcher] que rutea por path, las
 * respuestas se encolan en el mismo orden en que la app las dispara; no hay
 * llamadas concurrentes en ninguno de los dos flujos criticos (demo -> carta ->
 * configurar -> pedir; pedir -> pagar -> aceptado), asi que un simple `enqueue`
 * por llamada basta y mantiene los tests legibles. La unica excepcion es el
 * chequeo de readiness, ver [enqueueDemoLoginAndMenu].
 */
object FakeBackend {

    const val RESTAURANT_ID = "restaurant-demo"
    const val TABLE_ID = "table-1"
    const val ORDER_ID = "order-demo-1"
    const val PRODUCT_NAME = "Pizza margarita"
    const val PRODUCT_ID = "product-pizza-margarita"
    const val PRICE_CENTS = 1050L
    const val CURRENCY = "EUR"

    /** Numero de ticket que devuelve el pedido falso; se asevera en el ticket de pago aceptado. */
    const val DAILY_NUMBER = 1

    fun start(): MockWebServer = MockWebServer().apply { start() }

    /**
     * Encola readiness "ready" + demo-login + carta: lo necesario para llegar de Entry a Menu.
     * `EntryViewModel` comprueba `GET /health/readiness` en cuanto se abre la pantalla de
     * entrada -es decir, antes de que el test pueda encolar nada-, y el `QueueDispatcher` de
     * MockWebServer bloquea esa peticion hasta que haya una respuesta disponible; por eso la
     * respuesta de readiness va primera en la cola, para que la consuma esa peticion ya esperando
     * y las dos siguientes (demo-login, carta) le lleguen en orden al pedido real del test.
     */
    fun enqueueDemoLoginAndMenu(server: MockWebServer) {
        server.enqueue(readinessResponse())
        server.enqueue(demoLoginResponse())
        server.enqueue(freeServicePointResponse())
        server.enqueue(menuResponse())
        server.enqueue(menuResponse())
    }

    /** Igual que [enqueueDemoLoginAndMenu], pero reservando una respuesta extra para liberar la mesa antes de cargar la carta. */
    fun enqueueDemoLoginFreeAndMenu(server: MockWebServer) {
        enqueueDemoLoginAndMenu(server)
    }

    /** Encola abrir pedido + anadir linea + disparo a cocina (submitCart completo). */
    fun enqueueSubmitOrder(server: MockWebServer) {
        server.enqueue(orderResponse(status = "sent_to_kitchen"))
        server.enqueue(orderResponse(status = "sent_to_kitchen"))
        server.enqueue(sendToKitchenResponse())
    }

    /** Encola el pedido activo para poblar la tarjeta de progreso en cocina. */
    fun enqueueServicePointOrderStatus(server: MockWebServer) {
        server.enqueue(
            jsonResponse(
                200,
                """
                {
                  "order": {
                    "id": "$ORDER_ID",
                    "tableId": "$TABLE_ID",
                    "status": "sent_to_kitchen",
                    "openedAt": "2026-07-13T18:00:00.000Z",
                    "updatedAt": "2026-07-13T18:01:00.000Z",
                    "subtotalCents": $PRICE_CENTS,
                    "taxCents": 0,
                    "totalCents": $PRICE_CENTS,
                    "currency": "$CURRENCY"
                  },
                  "lines": [
                    {
                      "id": "line-1",
                      "productName": "$PRODUCT_NAME",
                      "quantity": 1,
                      "status": "preparing"
                    }
                  ]
                }
                """.trimIndent(),
            ),
        )
    }

    /** Encola el registro de pago (Checkout -> pago aceptado). */
    fun enqueuePayment(server: MockWebServer) {
        server.enqueue(orderResponse(status = "paid", paidCents = PRICE_CENTS))
    }

    /**
     * Encola el logout de "Salir de la mesa". [com.mesaflow.client.core.data.AuthRepository.logout]
     * ignora fallos de red, pero sin respuesta encolada la llamada esperaria el
     * timeout completo de OkHttp y alargaria el test sin motivo.
     */
    fun enqueueLogout(server: MockWebServer) {
        server.enqueue(jsonResponse(200, "{}"))
    }

    fun enqueueFreeServicePoint(server: MockWebServer) {
        server.enqueue(freeServicePointResponse())
    }

    /**
     * Encola un unico 500: sirve para simular que la primera llamada de un
     * flujo (abrir pedido, registrar pago...) falla en el servidor, sin
     * llegar a consumir las respuestas ya encoladas para el reintento.
     */
    fun enqueueServerError(server: MockWebServer) {
        server.enqueue(MockResponse().setResponseCode(500))
    }

    private fun readinessResponse(): MockResponse = jsonResponse(
        200,
        """{"status":"ready","database":"ready","durationMs":1}""",
    )

    private fun demoLoginResponse(): MockResponse = jsonResponse(
        201,
        """
        {
          "accessToken": "fake-access-token",
          "tokenType": "Bearer",
          "expiresIn": 3600,
          "user": { "id": "user-demo", "email": "demo@mesaflow.test" },
          "permissions": ["service"],
          "roles": ["customer"],
          "scopes": { "organizations": [], "restaurants": ["$RESTAURANT_ID"] }
        }
        """.trimIndent(),
    )

    private fun menuResponse(): MockResponse = jsonResponse(
        200,
        """
        {
          "id": "menu-1",
          "restaurantId": "$RESTAURANT_ID",
          "name": "Carta demo",
          "isActive": true,
          "sections": [
            {
              "id": "section-1",
              "name": "Principales",
              "sortOrder": 0,
              "isVisible": true,
              "items": [
                {
                  "id": "item-1",
                  "restaurantProductId": "$PRODUCT_ID",
                  "name": "$PRODUCT_NAME",
                  "description": "Tomate, mozzarella y albahaca",
                  "productType": "simple",
                  "priceCents": $PRICE_CENTS,
                  "currency": "$CURRENCY",
                  "isAvailable": true
                }
              ]
            }
          ]
        }
        """.trimIndent(),
    )

    private fun orderResponse(status: String, totalCents: Long = PRICE_CENTS, paidCents: Long = 0): MockResponse =
        jsonResponse(
            201,
            """
            {
              "order": {
                "id": "$ORDER_ID",
                "dailyNumber": $DAILY_NUMBER,
                "restaurantId": "$RESTAURANT_ID",
                "tableId": "$TABLE_ID",
                "status": "$status",
                "currency": "$CURRENCY",
                "subtotalCents": $totalCents,
                "taxCents": 0,
                "totalCents": $totalCents,
                "paidCents": $paidCents,
                "balanceCents": ${totalCents - paidCents}
              }
            }
            """.trimIndent(),
        )

    /** Deserializa a `Unit` (kotlinx.serialization exige `{}` para eso). */
    private fun sendToKitchenResponse(): MockResponse = jsonResponse(201, "{}")

    /** Deserializa a `Unit` (kotlinx.serialization exige `{}` para eso). */
    private fun freeServicePointResponse(): MockResponse = jsonResponse(201, "{}")

    private fun jsonResponse(code: Int, body: String): MockResponse =
        MockResponse()
            .setResponseCode(code)
            .setHeader("Content-Type", "application/json")
            .setBody(body)
}
