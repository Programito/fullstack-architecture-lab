package com.mesaflow.client.core.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.mesaflow.client.core.model.Session
import com.mesaflow.client.core.model.TableContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/**
 * Persistencia de sesión y contexto de mesa en DataStore.
 * Recibe el DataStore por constructor para poder testearse en JVM puro.
 */
@Singleton
class SessionStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {

    val session: Flow<Session?> = dataStore.data.map { prefs ->
        val token = prefs[KEY_ACCESS_TOKEN] ?: return@map null
        Session(
            accessToken = token,
            userId = prefs[KEY_USER_ID].orEmpty(),
            email = prefs[KEY_EMAIL].orEmpty(),
            displayName = prefs[KEY_DISPLAY_NAME].orEmpty(),
            roles = prefs[KEY_ROLES].toListOfStrings(),
            permissions = prefs[KEY_PERMISSIONS].toListOfStrings(),
            restaurantScopes = prefs[KEY_RESTAURANT_SCOPES].toListOfStrings(),
        )
    }

    val tableContext: Flow<TableContext?> = dataStore.data.map { prefs ->
        val restaurantId = prefs[KEY_RESTAURANT_ID] ?: return@map null
        val tableId = prefs[KEY_TABLE_ID] ?: return@map null
        TableContext(restaurantId = restaurantId, tableId = tableId)
    }

    val refreshCookie: Flow<String?> = dataStore.data.map { prefs -> prefs[KEY_REFRESH_COOKIE] }

    suspend fun currentSession(): Session? = session.first()

    suspend fun currentRefreshCookie(): String? = refreshCookie.first()

    suspend fun saveSession(session: Session, refreshCookie: String?) {
        dataStore.edit { prefs ->
            prefs[KEY_ACCESS_TOKEN] = session.accessToken
            prefs[KEY_USER_ID] = session.userId
            prefs[KEY_EMAIL] = session.email
            prefs[KEY_DISPLAY_NAME] = session.displayName
            prefs[KEY_ROLES] = session.roles.joinToString(SEPARATOR)
            prefs[KEY_PERMISSIONS] = session.permissions.joinToString(SEPARATOR)
            prefs[KEY_RESTAURANT_SCOPES] = session.restaurantScopes.joinToString(SEPARATOR)
            if (refreshCookie != null) {
                prefs[KEY_REFRESH_COOKIE] = refreshCookie
            }
        }
    }

    suspend fun saveTableContext(context: TableContext) {
        dataStore.edit { prefs ->
            prefs[KEY_RESTAURANT_ID] = context.restaurantId
            prefs[KEY_TABLE_ID] = context.tableId
        }
    }

    suspend fun clear() {
        dataStore.edit { prefs ->
            SESSION_KEYS.forEach(prefs::remove)
        }
    }

    private fun String?.toListOfStrings(): List<String> =
        this?.takeIf { it.isNotBlank() }?.split(SEPARATOR).orEmpty()

    private companion object {
        const val SEPARATOR = " "
        val KEY_ACCESS_TOKEN = stringPreferencesKey("access_token")
        val KEY_USER_ID = stringPreferencesKey("user_id")
        val KEY_EMAIL = stringPreferencesKey("email")
        val KEY_DISPLAY_NAME = stringPreferencesKey("display_name")
        val KEY_ROLES = stringPreferencesKey("roles")
        val KEY_PERMISSIONS = stringPreferencesKey("permissions")
        val KEY_RESTAURANT_SCOPES = stringPreferencesKey("restaurant_scopes")
        val KEY_RESTAURANT_ID = stringPreferencesKey("restaurant_id")
        val KEY_TABLE_ID = stringPreferencesKey("table_id")
        val KEY_REFRESH_COOKIE = stringPreferencesKey("refresh_cookie")
        val SESSION_KEYS = listOf(
            KEY_ACCESS_TOKEN,
            KEY_USER_ID,
            KEY_EMAIL,
            KEY_DISPLAY_NAME,
            KEY_ROLES,
            KEY_PERMISSIONS,
            KEY_RESTAURANT_SCOPES,
            KEY_RESTAURANT_ID,
            KEY_TABLE_ID,
            KEY_REFRESH_COOKIE,
        )
    }
}
