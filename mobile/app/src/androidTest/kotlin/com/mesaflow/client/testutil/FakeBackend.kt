package com.mesaflow.client.testutil

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer

/**
 * Fixtures del backend para los tests instrumentados de extremo a extremo.
 * En vez de un [okhttp3.mockwebserver.Dispatcher] que rutea por path, las
 * respuestas se encolan en el mismo orden en que la app las dispara — no hay
 * llamadas concurrentes en ninguno de los dos flujos críticos (demo → carta →
 * configurar → pedir; pedir → pagar → aceptado), así que un simple `enqueue`
 * por llamada basta y mantiene los tests legibles.
 */
object FakeBackend {

    const val RESTAURANT_ID = "restaurant-demo"
    const val TABLE_ID = "table-1"
    const val ORDER_ID = "order-demo-1"
    const val PRODUCT_NAME = "Pizza margarita"
    const val PRODUCT_ID = "product-pizza-margarita"
    const val PRICE_CENTS = 1050L
    const val CURRENCY = "EUR"

    fun start(): MockWebServer = MockWebServer().apply { start() }

    /** Encola demo-login + carta: lo necesario para llegar de Entry a Menu. */
    fun enqueueDemoLoginAndMenu(server: MockWebServer) {
        server.enqueue(demoLoginResponse())
        server.enqueue(menuResponse())
    }

    /** Encola abrir pedido + añadir línea + disparo a cocina (submitCart completo). */
    fun enqueueSubmitOrder(server: MockWebServer) {
        server.enqueue(orderResponse(status = "sent_to_kitchen"))
        server.enqueue(orderResponse(status = "sent_to_kitchen"))
        server.enqueue(sendToKitchenResponse())
    }

    /** Encola el registro de pago (Checkout → pago aceptado). */
    fun enqueuePayment(server: MockWebServer) {
        server.enqueue(orderResponse(status = "paid", paidCents = PRICE_CENTS))
    }

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

    private fun jsonResponse(code: Int, body: String): MockResponse =
        MockResponse()
            .setResponseCode(code)
            .setHeader("Content-Type", "application/json")
            .setBody(body)
}
