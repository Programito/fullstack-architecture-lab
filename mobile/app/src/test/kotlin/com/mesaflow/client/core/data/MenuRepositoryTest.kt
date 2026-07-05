package com.mesaflow.client.core.data

import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.model.ProductType
import com.mesaflow.client.core.network.MenuApi
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class MenuRepositoryTest {

    private lateinit var server: MockWebServer
    private lateinit var repository: MenuRepository

    /** JSON con la forma real de RestaurantMenuResponseDto del backend. */
    private val menuBody = """
        {
          "id": "menu-1",
          "restaurantId": "rest-demo",
          "name": "Carta principal",
          "isActive": true,
          "sections": [
            {
              "id": "sec-mains", "name": "Principales", "sortOrder": 2, "isVisible": true,
              "items": [
                {
                  "id": "item-burger", "restaurantProductId": "rp-burger", "name": "Hamburguesa craft",
                  "description": "200g con cheddar", "imageUrl": null, "productType": "simple",
                  "priceCents": 1250, "currency": "EUR", "isAvailable": true,
                  "modifierGroups": [
                    {
                      "id": "mg-extras", "name": "Extras", "selectionType": "multiple",
                      "minSelections": 0, "maxSelections": 3, "isRequired": false,
                      "options": [
                        { "id": "opt-queso", "name": "Extra queso", "priceDeltaCents": 100, "isAvailable": true }
                      ]
                    }
                  ],
                  "comboDefinition": null,
                  "platterComponents": [
                    { "id": "pc-cebolla", "name": "Cebolla", "removable": true, "replaceable": false, "sortOrder": 1 }
                  ]
                }
              ]
            },
            {
              "id": "sec-oculta", "name": "Interna", "sortOrder": 1, "isVisible": false,
              "items": [
                {
                  "id": "item-oculto", "name": "No visible", "productType": "simple",
                  "priceCents": 100, "currency": "EUR", "isAvailable": true,
                  "modifierGroups": [], "comboDefinition": null, "platterComponents": []
                }
              ]
            },
            {
              "id": "sec-menus", "name": "Menus", "sortOrder": 3, "isVisible": true,
              "items": [
                {
                  "id": "item-menu-dia", "restaurantProductId": "rp-menu", "name": "Menu del dia",
                  "productType": "combo", "priceCents": 1500, "currency": "EUR", "isAvailable": true,
                  "modifierGroups": [],
                  "comboDefinition": {
                    "id": "combo-1",
                    "slots": [
                      {
                        "id": "slot-bebida", "name": "Bebida", "minSelections": 1, "maxSelections": 1, "isRequired": true,
                        "options": [
                          { "id": "so-agua", "restaurantProductId": "rp-agua", "name": "Agua", "supplementPriceCents": 0, "isAvailable": true },
                          { "id": "so-vino", "restaurantProductId": "rp-vino", "name": "Vino", "supplementPriceCents": 200, "isAvailable": true }
                        ]
                      }
                    ]
                  },
                  "platterComponents": []
                }
              ]
            }
          ]
        }
    """.trimIndent()

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
        val api = Retrofit.Builder()
            .baseUrl(server.url("/api/v1/"))
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(MenuApi::class.java)
        repository = MenuRepository(api)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `mapea la carta completa y descarta secciones ocultas`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(200).setBody(menuBody))

        val result = repository.getMenu("rest-demo")

        assertTrue(result is AppResult.Success)
        val menu = (result as AppResult.Success).data
        assertEquals("Carta principal", menu.name)
        // La seccion no visible desaparece y el resto queda ordenado por sortOrder.
        assertEquals(listOf("sec-mains", "sec-menus"), menu.sections.map { it.id })

        val burger = menu.sections.first().items.single()
        assertEquals(ProductType.SIMPLE, burger.productType)
        assertEquals(100, burger.modifierGroups.single().options.single().priceDeltaCents)
        assertTrue(burger.platterComponents.single().removable)

        val menuDia = menu.sections.last().items.single()
        assertEquals(ProductType.COMBO, menuDia.productType)
        assertEquals(200, menuDia.comboDefinition!!.slots.single().options.last().supplementPriceCents)

        val request = server.takeRequest()
        assertEquals("/api/v1/restaurants/rest-demo/menu", request.path)
    }

    @Test
    fun `usa la cache en memoria en la segunda llamada`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(200).setBody(menuBody))

        repository.getMenu("rest-demo")
        val second = repository.getMenu("rest-demo")

        assertTrue(second is AppResult.Success)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun `forceRefresh vuelve a pedir la carta`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(200).setBody(menuBody))
        server.enqueue(MockResponse().setResponseCode(200).setBody(menuBody))

        repository.getMenu("rest-demo")
        repository.getMenu("rest-demo", forceRefresh = true)

        assertEquals(2, server.requestCount)
    }
}
