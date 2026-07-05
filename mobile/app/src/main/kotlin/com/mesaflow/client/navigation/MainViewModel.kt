package com.mesaflow.client.navigation

import androidx.lifecycle.ViewModel
import com.mesaflow.client.core.network.SessionEvents
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharedFlow

@HiltViewModel
class MainViewModel @Inject constructor(
    sessionEvents: SessionEvents,
) : ViewModel() {

    /** Se emite cuando el refresh falla definitivamente: expulsion a Entry. */
    val sessionExpired: SharedFlow<Unit> = sessionEvents.sessionExpired
}
