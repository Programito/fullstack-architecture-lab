package com.mesaflow.client

import android.app.Application
import com.mesaflow.client.core.data.AuthRepository
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject
import kotlinx.coroutines.runBlocking

@HiltAndroidApp
class MesaFlowApp : Application() {

    @Inject
    lateinit var authRepository: AuthRepository

    override fun onCreate() {
        super.onCreate()
        // Rehidrata la sesión persistida (token + cookie de refresh) de forma
        // SÍNCRONA antes de que arranque cualquier pantalla. restoreSession()
        // solo lee DataStore (sin red), así que el bloqueo es breve — mismo
        // patrón que MainActivity ya usa para leer el idioma guardado.
        //
        // Antes esto se lanzaba en un scope propio sin esperarlo
        // (applicationScope.launch { ... }), lo que abría una carrera: si una
        // pantalla disparaba una petición autenticada antes de que terminara
        // (p. ej. ReservationViewModel.init llama a refreshOwnReservation()
        // en cuanto se abre la pantalla, si el cliente ya tenía una reserva
        // propia guardada), TokenHolder.accessToken seguía siendo null pese a
        // haber una sesión válida persistida. La petición salía sin
        // Authorization, el backend respondía 401, TokenAuthenticator
        // intentaba refrescar sin cookie todavía restaurada, fallaba, y
        // emitía sessionExpired: la app expulsaba al cliente a Entry aunque
        // su sesión era perfectamente válida. Sensación: "el botón de
        // Reservar no lleva a la pantalla de reservas" (en realidad sí
        // navega, pero MesaFlowNavigation la saca inmediatamente por la
        // sesión "caducada").
        runBlocking { authRepository.restoreSession() }
    }
}
