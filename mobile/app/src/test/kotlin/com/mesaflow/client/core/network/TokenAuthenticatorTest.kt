package com.mesaflow.client.core.network

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import com.mesaflow.client.core.datastore.SessionStore
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
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
    private lateinit var cookieJar: SessionCookieJar
    private lateinit var sessionStore: SessionStore
    private lateinit var scope: CoroutineScope
    private lateinit var tmpFile: File
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
        cookieJar = SessionCookieJar()

        scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        tmpFile = File.createTempFile("token-authenticator-test", ".preferences_pb").also { it.delete() }
        val dataStore = PreferenceDataStoreFactory.create(scope = scope, produceFile = { tmpFile })
        sessionStore = SessionStore(dataStore)

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
            cookieJar = cookieJar,
            sessionStore = sessionStore,
        )

        client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenHolder))
            .authenticator(authenticator)
            .build()
    }

    @After
    fun tearDown() {
        server.shutdown()
        scope.cancel()
        tmpFile.delete()
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
    fun `si el refresh falla tambien se borra la sesion persistida, no solo el token en memoria`() {
        // Regresion: antes solo se limpiaba TokenHolder (en memoria). La sesion
        // persistida en SessionStore seguia ahi, asi que cualquier pantalla que
        // reutilizara "si hay sesion guardada, no vuelvas a hacer login" (ver
        // ReservationViewModel.ensureRestaurantId) encontraba la misma sesion
        // muerta una y otra vez y nunca disparaba un login nuevo.
        runBlocking {
            sessionStore.saveSession(
                session = com.mesaflow.client.core.model.Session(
                    accessToken = "token-caducado",
                    userId = "u1",
                    email = "customer@mesaflow.demo",
                    displayName = "Cliente Demo",
                    roles = listOf("customer"),
                    permissions = listOf("service"),
                    restaurantScopes = listOf("restaurant-mesaflow-centro"),
                ),
                refreshCookie = null,
            )
        }

        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setResponseCode(401))

        client.newCall(request("/api/v1/restaurants/r1/reservations")).execute()

        assertNull(runBlocking { sessionStore.currentSession() })
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
