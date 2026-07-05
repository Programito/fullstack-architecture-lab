package com.mesaflow.client.core.network

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

/** Señales de sesión a nivel app (p. ej. expulsión a Entry cuando caduca). */
@Singleton
class SessionEvents @Inject constructor() {

    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired: SharedFlow<Unit> = _sessionExpired

    fun notifySessionExpired() {
        _sessionExpired.tryEmit(Unit)
    }
}
