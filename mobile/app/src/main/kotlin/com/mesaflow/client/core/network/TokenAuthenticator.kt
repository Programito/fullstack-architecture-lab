package com.mesaflow.client.core.network

import com.mesaflow.client.core.datastore.SessionStore
import dagger.Lazy
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/**
 * Ante un 401 intenta refrescar la sesión UNA vez (cookie refresh_token) y
 * reintenta la petición original con el token nuevo. Si el refresh falla,
 * limpia el token y emite sessionExpired para que la UI expulse a Entry.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val tokenHolder: TokenHolder,
    private val refreshApi: Lazy<RefreshApi>,
    private val sessionEvents: SessionEvents,
    private val cookieJar: SessionCookieJar,
    private val sessionStore: SessionStore,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        // Los propios endpoints de auth nunca se reintentan (evita recursión).
        if (response.request.url.encodedPath.contains("/auth/")) return null
        // Un solo reintento por petición.
        if (priorResponseCount(response) >= 1) {
            expireSession()
            return null
        }

        synchronized(this) {
            val failedToken = response.request.header("Authorization")?.removePrefix("Bearer ")
            val current = tokenHolder.accessToken

            // Otro hilo ya refrescó mientras esperábamos el lock.
            val freshToken = if (current != null && current != failedToken) {
                current
            } else {
                runBlocking {
                    runCatching { refreshApi.get().refresh() }.getOrNull()
                }?.accessToken?.also { tokenHolder.accessToken = it }
            }

            if (freshToken == null) {
                expireSession()
                return null
            }

            return response.request.newBuilder()
                .header("Authorization", "Bearer $freshToken")
                .build()
        }
    }

    /**
     * Limpia token en memoria, cookie de refresco y la sesión persistida.
     * Antes solo se limpiaba el token en memoria: la sesión persistida
     * (SessionStore) seguía ahí, así que cualquier pantalla que reutilizara
     * "si hay sesión guardada, no vuelvas a hacer login" (ver
     * ReservationViewModel.ensureRestaurantId) encontraba la misma sesión
     * muerta una y otra vez y nunca disparaba un login nuevo — la app
     * quedaba en un bucle de 401 sin salida hasta forzar un logout manual.
     */
    private fun expireSession() {
        tokenHolder.clear()
        cookieJar.clear()
        runBlocking { sessionStore.clear() }
        sessionEvents.notifySessionExpired()
    }

    private fun priorResponseCount(response: Response): Int {
        var count = 0
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
