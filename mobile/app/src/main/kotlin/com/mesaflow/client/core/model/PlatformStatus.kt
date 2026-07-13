package com.mesaflow.client.core.model

/**
 * Estado de disponibilidad del backend, tal cual lo expone
 * `GET /api/v1/health/readiness`. La base de datos es de hosting gratuito y
 * puede quedarse dormida por inactividad, así que WARMING_UP es un estado
 * normal en el primer acceso, no un error.
 */
enum class PlatformStatus {
    READY,
    WARMING_UP,
    DOWN,
    UNKNOWN,
}
