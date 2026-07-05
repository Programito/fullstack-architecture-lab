package com.mesaflow.client.navigation

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

/** Claves de ruta de Navigation 3 (serializables: sobreviven a muerte de proceso). */

@Serializable
data object EntryKey : NavKey

@Serializable
data object MenuKey : NavKey
