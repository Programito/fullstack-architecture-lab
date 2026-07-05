package com.mesaflow.client.core.network

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/**
 * Escenario Gherkin de la Fase 2:
 *   Given una sesión con access token caducado
 *   When la app pide un recurso protegido
 *   Then se refresca el token una sola vez y la petición original se completa
 */
class TokenAuthenticatorTest {

    private lateinit var server: MockWebServer
    private lateinit var tokenHolder: TokenHolder
    private lateinit var sessionEvents: SessionEvents
    private lateinit var client: OkHttpClient

    private val authBody = """
        {
          "accessToken": "token-nuevo",
          "tokenType": "Bearer",
          "expiresIn": 900,
          "user": { "id": "u1", "email": "waiter@mesaflow.demo" },
          "permissions": ["service"],
          "roles": ["waiter"],
          "scopes": { "organizations": ["org-demo"], "restaurants": ["rest-demo"] }
        }
    """.trimIndent()

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()

        tokenHolder = TokenHolder().apply { accessToken = "token-caducado" }
        sessionEvents = SessionEvents()

        val json = Json { ignoreUnknownKeys = true }
        val refreshApi = Retrofit.Builder()
            .baseUrl(server.url("/api/v1/"))
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(RefreshApi::class.java)

        val authenticator = TokenAuthenticator(
            tokenHolder = tokenHolder,
            refreshApi = { refreshApi },
            sessionEvents = sessionEvents,
        )

        client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenHolder))
            .authenticator(authenticator)
            .build()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `ante un 401 refresca una vez y reintenta con el token nuevo`() {
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setResponseCode(200).setBody(authBody))
        server.enqueue(MockResponse().setResponseCode(200).setBody("{}"))

        val response = client.newCall(request("/api/v1/restaurants/r1/menu")).execute()

        assertEquals(200, response.code)
        assertEquals("token-nuevo", tokenHolder.accessToken)

        val first = server.takeRequest()
        assertEquals("Bearer token-caducado", first.getHeader("Authorization"))
        val refresh = server.takeRequest()
        assertTrue(refresh.path!!.endsWith("/auth/refresh"))
        val retried = server.takeRequest()
        assertEquals("Bearer token-nuevo", retried.getHeader("Authorization"))
    }

    @Test
    fun `si el refresh falla se limpia el token y se notifica sesion caducada`() {
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setResponseCode(401))

        val response = client.newCall(request("/api/v1/restaurants/r1/menu")).execute()

        assertEquals(401, response.code)
        assertNull(tokenHolder.accessToken)
    }

    @Test
    fun `un 401 del propio auth no se reintenta`() {
        server.enqueue(MockResponse().setResponseCode(401))

        val response = client.newCall(request("/api/v1/auth/login")).execute()

        assertEquals(401, response.code)
        assertEquals(1, server.requestCount)
    }

    private fun request(path: String): Request =
        Request.Builder().url(server.url(path)).build()
}
