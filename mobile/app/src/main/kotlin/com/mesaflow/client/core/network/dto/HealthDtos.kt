package com.mesaflow.client.core.network.dto

import kotlinx.serialization.Serializable

/* DTO espejo de backend/src/health (contrato /api/v1/health). */

@Serializable
data class ReadinessDto(
    val status: String,
    val database: String,
    val durationMs: Long = 0,
)
