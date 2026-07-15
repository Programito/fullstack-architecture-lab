package com.mesaflow.client.navigation

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

/** Claves de ruta de Navigation 3 (serializables: sobreviven a muerte de proceso). */

@Serializable
data object EntryKey : NavKey

@Serializable
data object MenuKey : NavKey

@Serializable
data object CartKey : NavKey

/** Ajustes de apariencia (tema e idioma); accesible desde la Carta y desde Entry. */
@Serializable
data class SettingsKey(
    val fromEntry: Boolean = false,
) : NavKey

/**
 * Cobro del pedido recién enviado; lleva lo mínimo para no depender de red.
 * [linesJson] es una foto (JSON, [CartLine] serializado) de las líneas enviadas: el carrito
 * real ya está vacío al llegar aquí, así que es la única fuente para el ticket detallado en
 * la pantalla de pago aceptado. [dailyNumber] y [tableLabel] son solo para mostrar (número de
 * ticket y mesa); no hace falta volver a pedirlos al backend.
 */
@Serializable
data class CheckoutKey(
    val orderId: String,
    val subtotalCents: Long,
    val taxCents: Long,
    val totalCents: Long,
    val currency: String,
    val linesJson: String,
    val dailyNumber: Int,
    val tableLabel: String,
) : NavKey
