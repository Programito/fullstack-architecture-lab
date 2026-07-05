package com.mesaflow.client.core.model

/** Sesión activa del cliente (mapeada desde la respuesta de auth del backend). */
data class Session(
    val accessToken: String,
    val userId: String,
    val email: String,
    val displayName: String,
    val roles: List<String>,
    val permissions: List<String>,
    val restaurantScopes: List<String>,
)

/** Mesa/restaurante activos, obtenidos del QR o del modo demo. */
data class TableContext(
    val restaurantId: String,
    val tableId: String,
)
