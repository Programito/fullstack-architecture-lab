package com.mesaflow.client.feature.settings
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.data.AuthRepository
import com.mesaflow.client.core.datastore.SettingsStore
import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.ThemeMode
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
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
    private val authRepository: AuthRepository,
) : ViewModel() {

    val uiState: StateFlow<SettingsUiState> = combine(
        settingsStore.themeMode,
        settingsStore.language,
    ) { themeMode, language -> SettingsUiState(themeMode, language) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SettingsUiState())

    /** Se emite cuando se confirma "Salir de la mesa": la navegación vacía el stack y vuelve a Entry. */
    private val _exitTable = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val exitTable: SharedFlow<Unit> = _exitTable.asSharedFlow()

    fun onThemeModeSelected(mode: ThemeMode) {
        viewModelScope.launch { settingsStore.setThemeMode(mode) }
    }

    fun onLanguageSelected(language: AppLanguage) {
        viewModelScope.launch { settingsStore.setLanguage(language) }
    }

    /** Cierra la sesión de mesa (token, cookie y contexto de mesa) y vuelve a Entry. */
    fun onExitTableConfirmed() {
        viewModelScope.launch {
            authRepository.logout()
            _exitTable.tryEmit(Unit)
        }
    }
}
