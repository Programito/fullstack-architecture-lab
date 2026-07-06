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

/** Cobro del pedido recién enviado; lleva lo mínimo para no depender de red. */
@Serializable
data class CheckoutKey(
    val orderId: String,
    val totalCents: Long,
    val currency: String,
) : NavKey
