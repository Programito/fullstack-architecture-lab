package com.mesaflow.client.core.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.mesaflow.client.core.model.OwnReservationRef
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/**
 * Guarda la referencia a la última reserva propia creada desde esta app.
 * No existe un listado de reservas para el cliente (ver ReservationsApi),
 * así que esta es la única forma de volver a consultarla o cancelarla tras
 * cerrar y reabrir la app. Usa el mismo DataStore que [SessionStore] pero
 * con claves propias (own_reservation_*) para no colisionar con las de
 * sesión/mesa.
 */
@Singleton
class ReservationStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {

    val ownReservation: Flow<OwnReservationRef?> = dataStore.data.map { prefs ->
        val reservationId = prefs[KEY_RESERVATION_ID] ?: return@map null
        val restaurantId = prefs[KEY_RESTAURANT_ID] ?: return@map null
        OwnReservationRef(restaurantId = restaurantId, reservationId = reservationId)
    }

    suspend fun currentOwnReservation(): OwnReservationRef? = ownReservation.first()

    suspend fun saveOwnReservation(ref: OwnReservationRef) {
        dataStore.edit { prefs ->
            prefs[KEY_RESTAURANT_ID] = ref.restaurantId
            prefs[KEY_RESERVATION_ID] = ref.reservationId
        }
    }

    suspend fun clearOwnReservation() {
        dataStore.edit { prefs ->
            prefs.remove(KEY_RESTAURANT_ID)
            prefs.remove(KEY_RESERVATION_ID)
        }
    }

    private companion object {
        val KEY_RESTAURANT_ID = stringPreferencesKey("own_reservation_restaurant_id")
        val KEY_RESERVATION_ID = stringPreferencesKey("own_reservation_id")
    }
}
