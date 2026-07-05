package com.mesaflow.client.feature.entry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.AuthRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.TableContext
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Mesa usada en modo demo. Debe existir en el seed del restaurante demo del
 * backend; se ajustara cuando la Fase 6 envie pedidos reales a una mesa.
 */
const val DEMO_TABLE_ID = "mesa-1"

data class EntryUiState(
    val isLoading: Boolean = false,
    val error: EntryError? = null,
)

enum class EntryError { QR_INVALID, NETWORK, UNAUTHORIZED, GENERIC }

@HiltViewModel
class EntryViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionStore: SessionStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(EntryUiState())
    val uiState: StateFlow<EntryUiState> = _uiState.asStateFlow()

    private val _navigateToMenu = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val navigateToMenu: SharedFlow<Unit> = _navigateToMenu.asSharedFlow()

    /** Resultado del escaner: valida el QR y entra en el restaurante escaneado. */
    fun onQrScanned(rawValue: String?) {
        val table = QrPayloadParser.parse(rawValue)
        if (table == null) {
            _uiState.update { it.copy(error = EntryError.QR_INVALID) }
            return
        }
        signInAndEnter(table)
    }

    /** Modo demo: entra directamente al restaurante demo con el rol de servicio. */
    fun onDemoModeClick() {
        signInAndEnter(table = null)
    }

    fun onErrorShown() {
        _uiState.update { it.copy(error = null) }
    }

    private fun signInAndEnter(table: TableContext?) {
        if (_uiState.value.isLoading) return
        _uiState.update { it.copy(isLoading = true, error = null) }

        viewModelScope.launch {
            // Autenticacion: mientras no exista un acceso publico de cliente,
            // tanto QR como demo usan el demo-login del backend (rol waiter).
            when (val result = authRepository.demoLogin()) {
                is AppResult.Success -> {
                    val context = table ?: TableContext(
                        restaurantId = result.data.restaurantScopes.firstOrNull().orEmpty(),
                        tableId = DEMO_TABLE_ID,
                    )
                    if (context.restaurantId.isBlank()) {
                        _uiState.update { it.copy(isLoading = false, error = EntryError.GENERIC) }
                        return@launch
                    }
                    sessionStore.saveTableContext(context)
                    _uiState.update { it.copy(isLoading = false) }
                    _navigateToMenu.tryEmit(Unit)
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(isLoading = false, error = result.error.toEntryError())
                }
            }
        }
    }
}

private fun AppError.toEntryError(): EntryError = when (this) {
    AppError.Network -> EntryError.NETWORK
    AppError.Unauthorized -> EntryError.UNAUTHORIZED
    else -> EntryError.GENERIC
}
