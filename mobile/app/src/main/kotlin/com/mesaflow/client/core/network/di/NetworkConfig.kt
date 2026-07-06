package com.mesaflow.client.core.network.di

/**
 * Punto de override de la URL base para tests instrumentados: los tests
 * end-to-end (ver `app/src/androidTest`) arrancan un MockWebServer y fijan
 * aquí su URL antes de que Hilt cree el grafo de red, sin tener que duplicar
 * todo [NetworkModule] en un módulo de test. En producción y en debug normal
 * queda en `null` y [NetworkModule.provideBaseUrl] usa `BuildConfig.BASE_URL`.
 */
object NetworkConfig {
    @Volatile
    var baseUrlOverride: String? = null
}
