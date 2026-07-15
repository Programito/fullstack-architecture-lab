package com.mesaflow.client.feature.entry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.AuthRepository
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.data.OrderRepository
import com.mesaflow.client.core.data.PlatformReadinessRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.PlatformStatus
import com.mesaflow.client.core.model.TableContext
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Mesa usada en modo demo: debe coincidir con un id real del seed
 * (prisma/seeds/mesaflow-layout.seed.ts crea table-1..table-4 y stool-1..3).
 * Antes de la Fase 6 no importaba porque no se enviaban pedidos reales a
 * ninguna mesa; ahora sí, así que tiene que ser un id que exista de verdad.
 */
const val DEMO_TABLE_ID = "table-1"

/** Cada cuanto se vuelve a comprobar el estado de la plataforma mientras no esta `ready`. */
private const val READINESS_POLL_INTERVAL_MS = 5_000L

data class EntryUiState(
    val isLoading: Boolean = false,
    val error: EntryError? = null,
    /** null hasta la primera comprobacion; distinto de [PlatformStatus.READY] mientras la base gratuita despierta. */
    val readinessStatus: PlatformStatus? = null,
)

enum class EntryError { QR_INVALID, NETWORK, UNAUTHORIZED, GENERIC }

@HiltViewModel
class EntryViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionStore: SessionStore,
    private val platformReadinessRepository: PlatformReadinessRepository,
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(EntryUiState())
    val uiState: StateFlow<EntryUiState> = _uiState.asStateFlow()

    private val _navigateToMenu = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val navigateToMenu: SharedFlow<Unit> = _navigateToMenu.asSharedFlow()

    init {
        watchReadiness()
    }

    /**
     * La base de datos es de hosting gratuito y puede quedarse dormida por inactividad, asi que
     * el primer acceso puede tardar unos segundos en responder. Se comprueba al abrir la pantalla
     * de entrada y, si no esta `ready`, se reintenta cada [READINESS_POLL_INTERVAL_MS] hasta que lo
     * este, mostrando un aviso mientras tanto (ver [EntryScreen]).
     */
    private fun watchReadiness() {
        viewModelScope.launch {
            while (true) {
                val status = platformReadinessRepository.check()
                _uiState.update { it.copy(readinessStatus = status) }
                if (status == PlatformStatus.READY) break
                delay(READINESS_POLL_INTERVAL_MS)
            }
        }
    }

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
            // tanto QR como demo usan el demo-login del backend con el rol
            // dedicado "customer" (solo permiso `service`, ver DEMO_CLIENT_ROLE).
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
                    // Elegir mesa (incluso si es la misma de antes) empieza un pedido nuevo: un
                    // carrito de una sesion anterior (mesa distinta, o la sesion expiro y volvio
                    // aqui con el carrito todavia en Room) no debe colarse en la mesa recien
                    // elegida. El carrito esta indexado solo por restaurantId (ver CartRepository).
                    cartRepository.clear(context.restaurantId)
                    when (val freeResult = orderRepository.freeTable(context.restaurantId, context.tableId)) {
                        is AppResult.Success -> {
                            sessionStore.saveTableContext(context)
                            _uiState.update { it.copy(isLoading = false) }
                            _navigateToMenu.tryEmit(Unit)
                        }
                        is AppResult.Error -> _uiState.update {
                            it.copy(isLoading = false, error = freeResult.error.toEntryError())
                        }
                    }
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
