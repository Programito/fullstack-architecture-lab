package com.mesaflow.client.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.datastore.SettingsStore
import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.ThemeMode
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class SettingsUiState(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val language: AppLanguage = AppLanguage.SYSTEM,
)

/** Ajustes de apariencia (tema e idioma), persistidos en [SettingsStore]. */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsStore: SettingsStore,
) : ViewModel() {

    val uiState: StateFlow<SettingsUiState> = combine(
        settingsStore.themeMode,
        settingsStore.language,
    ) { themeMode, language -> SettingsUiState(themeMode, language) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SettingsUiState())

    fun onThemeModeSelected(mode: ThemeMode) {
        viewModelScope.launch { settingsStore.setThemeMode(mode) }
    }

    fun onLanguageSelected(language: AppLanguage) {
        viewModelScope.launch { settingsStore.setLanguage(language) }
    }
}
