package com.mesaflow.client.core.data

import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.common.safeApiCall
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.Session
import com.mesaflow.client.core.network.AuthApi
import com.mesaflow.client.core.network.SessionCookieJar
import com.mesaflow.client.core.network.TokenHolder
import com.mesaflow.client.core.network.dto.AuthResponseDto
import com.mesaflow.client.core.network.dto.DemoLoginRequestDto
import com.mesaflow.client.core.network.dto.LoginRequestDto
import com.mesaflow.client.core.network.dto.PublicConfigDto
import javax.inject.Inject
import javax.inject.Named
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import okhttp3.HttpUrl.Companion.toHttpUrl

/** Rol demo con permiso `service` (mesas, pedidos y cobros) en el backend. */
const val DEMO_CLIENT_ROLE = "waiter"

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val sessionStore: SessionStore,
    private val tokenHolder: TokenHolder,
    private val cookieJar: SessionCookieJar,
    @Named("baseUrl") private val baseUrl: String,
) {

    val session: Flow<Session?> = sessionStore.session

    /**
     * Rehidrata token y cookie de refresh tras un reinicio del proceso.
     * Si el access token persistido ya caducó, el TokenAuthenticator lo
     * renovará de forma transparente en la primera petición.
     */
    suspend fun restoreSession() {
        val stored = sessionStore.currentSession() ?: return
        tokenHolder.accessToken = stored.accessToken
        cookieJar.restore(baseUrl.toHttpUrl(), sessionStore.currentRefreshCookie())
    }

    suspend fun publicConfig(): AppResult<PublicConfigDto> = safeApiCall { authApi.publicConfig() }

    suspend fun demoLogin(role: String = DEMO_CLIENT_ROLE): AppResult<Session> =
        safeApiCall { authApi.demoLogin(DemoLoginRequestDto(role)) }.alsoPersist()

    suspend fun login(email: String, password: String): AppResult<Session> =
        safeApiCall { authApi.login(LoginRequestDto(email = email, password = password)) }.alsoPersist()

    suspend fun logout() {
        runCatching { authApi.logout() }
        tokenHolder.clear()
        cookieJar.clear()
        sessionStore.clear()
    }

    private suspend fun AppResult<AuthResponseDto>.alsoPersist(): AppResult<Session> = when (this) {
        is AppResult.Success -> {
            val session = data.toSession()
            tokenHolder.accessToken = session.accessToken
            sessionStore.saveSession(session, refreshCookie = cookieJar.snapshot())
            AppResult.Success(session)
        }
        is AppResult.Error -> this
    }
}

internal fun AuthResponseDto.toSession(): Session = Session(
    accessToken = accessToken,
    userId = user.id,
    email = user.email,
    displayName = listOfNotNull(user.firstName, user.lastName)
        .joinToString(" ")
        .ifBlank { user.email },
    roles = roles,
    permissions = permissions,
    restaurantScopes = scopes.restaurants,
)
