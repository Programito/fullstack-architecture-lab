package com.mesaflow.client

import android.app.Application
import com.mesaflow.client.core.data.AuthRepository
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@HiltAndroidApp
class MesaFlowApp : Application() {

    @Inject
    lateinit var authRepository: AuthRepository

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        // Rehidrata la sesión persistida (token + cookie de refresh) al arrancar.
        applicationScope.launch { authRepository.restoreSession() }
    }
}
