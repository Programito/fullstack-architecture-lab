package com.mesaflow.client.core.network

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class ClientOriginInterceptorTest {

    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `adds the apk client origin header to outgoing requests`() {
        server.enqueue(MockResponse().setResponseCode(200).setBody("{}"))
        val client = OkHttpClient.Builder()
            .addInterceptor(ClientOriginInterceptor())
            .build()

        client.newCall(Request.Builder().url(server.url("/api/v1/auth/demo-login")).build()).execute()

        val request = server.takeRequest()
        assertEquals(APK_CLIENT_ORIGIN, request.getHeader(CLIENT_ORIGIN_HEADER))
    }
}
