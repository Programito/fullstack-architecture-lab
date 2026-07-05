package com.mesaflow.client.core.network

import okhttp3.Cookie
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionCookieJarTest {

    private val baseUrl = "http://10.0.2.2:3000/api/v1/".toHttpUrl()
    private val authUrl = "http://10.0.2.2:3000/api/v1/auth/refresh".toHttpUrl()

    private fun refreshCookie(): Cookie =
        Cookie.Builder()
            .name(SessionCookieJar.REFRESH_COOKIE_NAME)
            .value("token-de-refresco")
            .domain("10.0.2.2")
            .path("/api/v1/auth")
            .build()

    @Test
    fun `captura la cookie de refresh y la devuelve para rutas de auth`() {
        val jar = SessionCookieJar()
        jar.saveFromResponse(authUrl, listOf(refreshCookie()))

        val cookies = jar.loadForRequest(authUrl)

        assertEquals(1, cookies.size)
        assertEquals("token-de-refresco", cookies.first().value)
    }

    @Test
    fun `no envia la cookie a rutas fuera de su path`() {
        val jar = SessionCookieJar()
        jar.saveFromResponse(authUrl, listOf(refreshCookie()))

        val cookies = jar.loadForRequest("http://10.0.2.2:3000/api/v1/restaurants/r1/menu".toHttpUrl())

        assertTrue(cookies.isEmpty())
    }

    @Test
    fun `ignora cookies que no son de refresh`() {
        val jar = SessionCookieJar()
        val other = Cookie.Builder().name("otra").value("x").domain("10.0.2.2").build()
        jar.saveFromResponse(authUrl, listOf(other))

        assertTrue(jar.loadForRequest(authUrl).isEmpty())
    }

    @Test
    fun `snapshot y restore sobreviven a un reinicio simulado`() {
        val jar = SessionCookieJar()
        jar.saveFromResponse(authUrl, listOf(refreshCookie()))
        val snapshot = jar.snapshot()
        assertNotNull(snapshot)

        val newJar = SessionCookieJar()
        newJar.restore(baseUrl, snapshot)

        val cookies = newJar.loadForRequest(authUrl)
        assertEquals(1, cookies.size)
        assertEquals("token-de-refresco", cookies.first().value)
    }
}
