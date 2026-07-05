package com.mesaflow.client.core.network

import com.mesaflow.client.core.network.dto.AuthResponseDto
import com.mesaflow.client.core.network.dto.DemoLoginRequestDto
import com.mesaflow.client.core.network.dto.LoginRequestDto
import com.mesaflow.client.core.network.dto.PublicConfigDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/** Endpoints de /api/v1/auth del backend MesaFlow. */
interface AuthApi {

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequestDto): AuthResponseDto

    @POST("auth/demo-login")
    suspend fun demoLogin(@Body body: DemoLoginRequestDto): AuthResponseDto

    @GET("auth/public-config")
    suspend fun publicConfig(): PublicConfigDto

    @POST("auth/logout")
    suspend fun logout()
}

/**
 * API de refresh aislada: su cliente OkHttp NO lleva TokenAuthenticator,
 * para que un 401 del propio refresh no provoque recursión.
 * El refresh token viaja como cookie httpOnly gestionada por SessionCookieJar.
 */
interface RefreshApi {

    @POST("auth/refresh")
    suspend fun refresh(): AuthResponseDto
}
