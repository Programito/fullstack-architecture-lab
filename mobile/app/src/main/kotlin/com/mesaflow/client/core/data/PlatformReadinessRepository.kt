package com.mesaflow.client.core.data

import com.mesaflow.client.core.model.PlatformStatus
import com.mesaflow.client.core.network.HealthApi
import com.mesaflow.client.core.network.dto.ReadinessDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlatformReadinessRepository @Inject constructor(
    private val healthApi: HealthApi,
) {

    /** Nunca falla: un fallo de red al comprobar readiness se trata igual que "despertando". */
    suspend fun check(): PlatformStatus =
        runCatching { healthApi.readiness() }
            .getOrNull()
            ?.toPlatformStatus()
            ?: PlatformStatus.WARMING_UP
}

private fun ReadinessDto.toPlatformStatus(): PlatformStatus = when (status) {
    "ready" -> PlatformStatus.READY
    "warming_up" -> PlatformStatus.WARMING_UP
    "down" -> PlatformStatus.DOWN
    else -> PlatformStatus.UNKNOWN
}
