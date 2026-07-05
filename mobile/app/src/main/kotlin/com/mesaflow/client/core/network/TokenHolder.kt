package com.mesaflow.client.core.network

import javax.inject.Inject
import javax.inject.Singleton

/**
 * Copia en memoria del access token para no tocar DataStore en cada petición.
 * AuthRepository lo sincroniza con la sesión persistida.
 */
@Singleton
class TokenHolder @Inject constructor() {

    @Volatile
    var accessToken: String? = null

    fun clear() {
        accessToken = null
    }
}
