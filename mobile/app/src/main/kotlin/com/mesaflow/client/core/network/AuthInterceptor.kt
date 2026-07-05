package com.mesaflow.client.core.network

import javax.inject.Inject
import javax.inject.Singleton
import okhttp3.Interceptor
import okhttp3.Response

/** Añade el Bearer token a toda petición saliente (si hay sesión). */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenHolder: TokenHolder,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenHolder.accessToken ?: return chain.proceed(chain.request())
        val request = chain.request().newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
        return chain.proceed(request)
    }
}
