package com.mesaflow.client

import android.content.Context
import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mesaflow.client.core.datastore.SettingsStore
import com.mesaflow.client.core.designsystem.LocalWindowWidthSizeClass
import com.mesaflow.client.core.designsystem.MesaFlowTheme
import com.mesaflow.client.core.designsystem.rememberWindowWidthSizeClass
import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.ThemeMode
import com.mesaflow.client.navigation.MesaFlowNavigation
import dagger.hilt.android.AndroidEntryPoint
import java.util.Locale
import javax.inject.Inject
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject
    lateinit var settingsStore: SettingsStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val initialLanguage = runBlocking { settingsStore.language.first() }
        setContent {
            val themeMode by settingsStore.themeMode.collectAsStateWithLifecycle(
                initialValue = ThemeMode.SYSTEM,
            )
            val language by settingsStore.language.collectAsStateWithLifecycle(
                initialValue = initialLanguage,
            )

            val windowWidthSizeClass = rememberWindowWidthSizeClass()

            ProvideAppLanguage(language = language) {
                CompositionLocalProvider(LocalWindowWidthSizeClass provides windowWidthSizeClass) {
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
    }
}

@Composable
private fun ProvideAppLanguage(
    language: AppLanguage,
    content: @Composable () -> Unit,
) {
    val baseContext = LocalContext.current
    val baseConfiguration = LocalConfiguration.current

    if (language.tag == null) {
        content()
        return
    }

    val localizedConfiguration = Configuration(baseConfiguration).apply {
        setLocale(Locale.forLanguageTag(language.tag))
        setLayoutDirection(Locale.forLanguageTag(language.tag))
    }
    val localizedContext = baseContext.createConfigurationContext(localizedConfiguration)

    CompositionLocalProvider(
        LocalContext provides localizedContext,
        LocalConfiguration provides localizedConfiguration,
    ) {
        content()
    }
}
