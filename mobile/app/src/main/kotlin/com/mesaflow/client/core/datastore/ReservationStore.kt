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
 * Guarda las referencias a las reservas propias creadas desde esta app.
 * No existe un listado de reservas para el cliente (ver ReservationsApi),
 * así que esta es la única forma de volver a consultarlas o cancelarlas tras
 * cerrar y reabrir la app. Usa el mismo DataStore que [SessionStore] pero
 * con claves propias (own_reservation*) para no colisionar con las de
 * sesión/mesa.
 *
 * Formato: una sola preferencia de texto con una referencia por línea,
 * `restaurantId|reservationId`. Las claves antiguas de reserva única
 * (own_reservation_restaurant_id / own_reservation_id) se siguen leyendo
 * como migración y se eliminan en la primera escritura.
 */
@Singleton
class ReservationStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {

    val ownReservations: Flow<List<OwnReservationRef>> = dataStore.data.map { prefs ->
        readRefs(prefs)
    }

    suspend fun currentOwnReservations(): List<OwnReservationRef> = ownReservations.first()

    /** Primera reserva guardada, si hay alguna (conveniencia/compatibilidad). */
    suspend fun currentOwnReservation(): OwnReservationRef? = currentOwnReservations().firstOrNull()

    suspend fun addOwnReservation(ref: OwnReservationRef) {
        dataStore.edit { prefs ->
            val refs = readRefs(prefs)
            writeRefs(prefs, if (refs.contains(ref)) refs else refs + ref)
        }
    }

    suspend fun removeOwnReservation(ref: OwnReservationRef) {
        dataStore.edit { prefs ->
            writeRefs(prefs, readRefs(prefs) - ref)
        }
    }

    suspend fun clearOwnReservations() {
        dataStore.edit { prefs ->
            writeRefs(prefs, emptyList())
        }
    }

    private fun readRefs(prefs: Preferences): List<OwnReservationRef> {
        val encoded = prefs[KEY_RESERVATIONS]
        if (encoded != null) {
            return encoded.lineSequence()
                .mapNotNull { line ->
                    val parts = line.split(SEPARATOR, limit = 2)
                    if (parts.size == 2 && parts[0].isNotBlank() && parts[1].isNotBlank()) {
                        OwnReservationRef(restaurantId = parts[0], reservationId = parts[1])
                    } else {
                        null
                    }
                }
                .toList()
        }
        // Migración desde el formato antiguo de reserva única.
        val legacyReservationId = prefs[LEGACY_KEY_RESERVATION_ID] ?: return emptyList()
        val legacyRestaurantId = prefs[LEGACY_KEY_RESTAURANT_ID] ?: return emptyList()
        return listOf(OwnReservationRef(restaurantId = legacyRestaurantId, reservationId = legacyReservationId))
    }

    private fun writeRefs(prefs: androidx.datastore.preferences.core.MutablePreferences, refs: List<OwnReservationRef>) {
        prefs[KEY_RESERVATIONS] = refs.joinToString("\n") { "${it.restaurantId}$SEPARATOR${it.reservationId}" }
        prefs.remove(LEGACY_KEY_RESTAURANT_ID)
        prefs.remove(LEGACY_KEY_RESERVATION_ID)
    }

    private companion object {
        const val SEPARATOR = "|"
        val KEY_RESERVATIONS = stringPreferencesKey("own_reservations")
        val LEGACY_KEY_RESTAURANT_ID = stringPreferencesKey("own_reservation_restaurant_id")
        val LEGACY_KEY_RESERVATION_ID = stringPreferencesKey("own_reservation_id")
    }
}
