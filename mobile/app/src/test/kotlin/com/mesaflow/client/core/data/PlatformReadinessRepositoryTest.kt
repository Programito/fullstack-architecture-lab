package com.mesaflow.client.core.data

import com.mesaflow.client.core.model.PlatformStatus
import com.mesaflow.client.core.network.HealthApi
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class PlatformReadinessRepositoryTest {

    private lateinit var server: MockWebServer
    private lateinit var repository: PlatformReadinessRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()

        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
        val api = Retrofit.Builder()
            .baseUrl(server.url("/api/v1/"))
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(HealthApi::class.java)

        repository = PlatformReadinessRepository(api)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `ready se traduce a PlatformStatus READY`() = runBlocking {
        server.enqueue(
            MockResponse().setResponseCode(200)
                .setBody("""{"status":"ready","database":"ready","durationMs":42}"""),
        )

        assertEquals(PlatformStatus.READY, repository.check())
    }

    @Test
    fun `warming_up se traduce a PlatformStatus WARMING_UP`() = runBlocking {
        server.enqueue(
            MockResponse().setResponseCode(200)
                .setBody("""{"status":"warming_up","database":"warming_up","durationMs":1800}"""),
        )

        assertEquals(PlatformStatus.WARMING_UP, repository.check())
    }

    @Test
    fun `down se traduce a PlatformStatus DOWN`() = runBlocking {
        server.enqueue(
            MockResponse().setResponseCode(200)
                .setBody("""{"status":"down","database":"down","durationMs":0}"""),
        )

        assertEquals(PlatformStatus.DOWN, repository.check())
    }

    @Test
    fun `un fallo de red se trata como WARMING_UP en vez de propagar el error`() = runBlocking {
        server.shutdown()

        assertEquals(PlatformStatus.WARMING_UP, repository.check())
    }
}
