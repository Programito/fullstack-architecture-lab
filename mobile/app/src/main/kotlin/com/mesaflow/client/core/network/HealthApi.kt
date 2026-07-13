package com.mesaflow.client.core.network

import com.mesaflow.client.core.network.dto.ReadinessDto
import retrofit2.http.GET

/** Endpoint de /api/v1/health del backend MesaFlow. */
interface HealthApi {

    @GET("health/readiness")
    suspend fun readiness(): ReadinessDto
}
