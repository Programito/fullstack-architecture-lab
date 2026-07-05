package com.mesaflow.client.core.network

import javax.inject.Inject
import javax.inject.Singleton
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

/**
 * CookieJar mínimo para la cookie httpOnly `refresh_token` que emite el backend
 * (path /api/v1/auth). Mantiene la cookie en memoria; AuthRepository la persiste
 * en DataStore (snapshot/restore) para sobrevivir a reinicios del proceso.
 */
@Singleton
class SessionCookieJar @Inject constructor() : CookieJar {

    @Volatile
    private var cookies: List<Cookie> = emptyList()

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val relevant = cookies.filter { it.name == REFRESH_COOKIE_NAME }
        if (relevant.isNotEmpty()) {
            this.cookies = relevant
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> =
        cookies.filter { it.matches(url) && (it.expiresAt > System.currentTimeMillis() || it.persistent.not()) }

    /** Serializa la cookie de refresh para persistirla. */
    fun snapshot(): String? = cookies.firstOrNull()?.toString()

    /** Restaura una cookie persistida (formato Set-Cookie) contra la URL base. */
    fun restore(baseUrl: HttpUrl, setCookie: String?) {
        if (setCookie.isNullOrBlank()) return
        Cookie.parse(baseUrl, setCookie)?.let { cookies = listOf(it) }
    }

    fun clear() {
        cookies = emptyList()
    }

    companion object {
        const val REFRESH_COOKIE_NAME = "refresh_token"
    }
}
