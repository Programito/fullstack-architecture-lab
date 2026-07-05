package com.mesaflow.client.core.data

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.network.AuthApi
import com.mesaflow.client.core.network.SessionCookieJar
import com.mesaflow.client.core.network.TokenHolder
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class AuthRepositoryTest {

    private lateinit var server: MockWebServer
    private lateinit var repository: AuthRepository
    private lateinit var sessionStore: SessionStore
    private lateinit var tokenHolder: TokenHolder
    private lateinit var cookieJar: SessionCookieJar
    private lateinit var scope: CoroutineScope
    private lateinit var tmpFile: File

    private val authBody = """
        {
          "accessToken": "token-demo",
          "tokenType": "Bearer",
          "expiresIn": 900,
          "user": { "id": "u1", "email": "waiter@mesaflow.demo", "firstName": "Carlos", "lastName": "Camarero" },
          "permissions": ["service"],
          "roles": ["waiter"],
          "scopes": { "organizations": ["org-demo"], "restaurants": ["rest-demo"] }
        }
    """.trimIndent()

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()

        scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        tmpFile = File.createTempFile("session-test", ".preferences_pb").also { it.delete() }
        val dataStore = PreferenceDataStoreFactory.create(scope = scope, produceFile = { tmpFile })

        sessionStore = SessionStore(dataStore)
        tokenHolder = TokenHolder()
        cookieJar = SessionCookieJar()

        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
        val api = Retrofit.Builder()
            .baseUrl(server.url("/api/v1/"))
            .client(OkHttpClient.Builder().cookieJar(cookieJar).build())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(AuthApi::class.java)

        repository = AuthRepository(
            authApi = api,
            sessionStore = sessionStore,
            tokenHolder = tokenHolder,
            cookieJar = cookieJar,
            baseUrl = server.url("/api/v1/").toString(),
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
        scope.cancel()
        tmpFile.delete()
    }

    @Test
    fun `el login demo guarda sesion, token en memoria y cookie de refresh`() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Set-Cookie", "refresh_token=abc123; Path=/api/v1/auth; HttpOnly")
                .setBody(authBody),
        )

        val result = repository.demoLogin()

        assertTrue(result is AppResult.Success)
        val session = (result as AppResult.Success).data
        assertEquals("Carlos Camarero", session.displayName)
        assertEquals(listOf("rest-demo"), session.restaurantScopes)
        assertEquals("token-demo", tokenHolder.accessToken)

        val persisted = sessionStore.session.first()
        assertNotNull(persisted)
        assertEquals("token-demo", persisted!!.accessToken)
        assertNotNull(sessionStore.currentRefreshCookie())

        val request = server.takeRequest()
        assertTrue(request.path!!.endsWith("/auth/demo-login"))
        assertTrue(request.body.readUtf8().contains("waiter"))
    }

    @Test
    fun `un 401 en login se traduce a Unauthorized`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(401).setBody("{}"))

        val result = repository.login("mal@mail.com", "incorrecta")

        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Unauthorized, (result as AppResult.Error).error)
    }

    @Test
    fun `una caida de red se traduce a Network`() = runBlocking {
        server.shutdown()

        val result = repository.demoLogin()

        assertTrue(result is AppResult.Error)
        assertEquals(AppError.Network, (result as AppResult.Error).error)
    }

    @Test
    fun `logout limpia token, cookie y sesion persistida`() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Set-Cookie", "refresh_token=abc123; Path=/api/v1/auth; HttpOnly")
                .setBody(authBody),
        )
        server.enqueue(MockResponse().setResponseCode(204))

        repository.demoLogin()
        repository.logout()

        assertNull(tokenHolder.accessToken)
        assertNull(sessionStore.session.first())
        assertNull(cookieJar.snapshot())
    }

    @Test
    fun `restoreSession rehidrata token y cookie tras reinicio`() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Set-Cookie", "refresh_token=abc123; Path=/api/v1/auth; HttpOnly")
                .setBody(authBody),
        )
        repository.demoLogin()

        // Simula reinicio del proceso: memoria vacía, DataStore intacto.
        tokenHolder.clear()
        cookieJar.clear()

        repository.restoreSession()

        assertEquals("token-demo", tokenHolder.accessToken)
        assertNotNull(cookieJar.snapshot())
    }
}
