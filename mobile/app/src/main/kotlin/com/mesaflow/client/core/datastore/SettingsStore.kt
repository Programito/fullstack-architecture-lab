package com.mesaflow.client.core.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.ThemeMode
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Preferencias de apariencia del cliente (tema e idioma).
 *
 * A diferencia de `SessionStore`, esto es local al dispositivo y no va
 * ligado a una mesa ni a una sesión de usuario: no hay cuenta de cliente
 * final, así que la preferencia debe sobrevivir a `SessionStore.clear()`
 * y persistir entre visitas a cualquier restaurante con MesaFlow.
 *
 * Comparte el mismo `DataStore<Preferences>` que `SessionStore` (hay un
 * único fichero de preferencias en el módulo de red, ver `NetworkModule`);
 * las claves usadas aquí no colisionan con las de sesión.
 */
@Singleton
class SettingsStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {

    val themeMode: Flow<ThemeMode> = dataStore.data.map { prefs ->
        prefs[KEY_THEME_MODE]?.toThemeModeOrNull() ?: ThemeMode.SYSTEM
    }

    val language: Flow<AppLanguage> = dataStore.data.map { prefs ->
        prefs[KEY_LANGUAGE]?.toAppLanguageOrNull() ?: AppLanguage.SYSTEM
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        dataStore.edit { prefs -> prefs[KEY_THEME_MODE] = mode.name }
    }

    suspend fun setLanguage(language: AppLanguage) {
        dataStore.edit { prefs -> prefs[KEY_LANGUAGE] = language.name }
    }

    private fun String.toThemeModeOrNull(): ThemeMode? =
        runCatching { ThemeMode.valueOf(this) }.getOrNull()

    private fun String.toAppLanguageOrNull(): AppLanguage? =
        runCatching { AppLanguage.valueOf(this) }.getOrNull()

    private companion object {
        val KEY_THEME_MODE = stringPreferencesKey("theme_mode")
        val KEY_LANGUAGE = stringPreferencesKey("language")
    }
}
