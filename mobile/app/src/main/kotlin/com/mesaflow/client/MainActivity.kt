package com.mesaflow.client

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mesaflow.client.core.datastore.SettingsStore
import com.mesaflow.client.core.designsystem.MesaFlowTheme
import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.ThemeMode
import com.mesaflow.client.navigation.MesaFlowNavigation
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var settingsStore: SettingsStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val themeMode by settingsStore.themeMode.collectAsStateWithLifecycle(
                initialValue = ThemeMode.SYSTEM,
            )
            val language by settingsStore.language.collectAsStateWithLifecycle(
                initialValue = AppLanguage.SYSTEM,
            )

            // AppCompatDelegate persiste el override per-app y solo recrea la
            // Activity cuando el locale efectivo realmente cambia (API 33+ lo
            // integra además con Ajustes del sistema > Idiomas de la app).
            LaunchedEffect(language) {
                val locales = language.tag
                    ?.let { LocaleListCompat.forLanguageTags(it) }
                    ?: LocaleListCompat.getEmptyLocaleList()
                AppCompatDelegate.setApplicationLocales(locales)
            }

            MesaFlowTheme(
                darkTheme = when (themeMode) {
                    ThemeMode.SYSTEM -> isSystemInDarkTheme()
                    ThemeMode.LIGHT -> false
                    ThemeMode.DARK -> true
                },
            ) {
                MesaFlowNavigation()
            }
        }
    }
}
