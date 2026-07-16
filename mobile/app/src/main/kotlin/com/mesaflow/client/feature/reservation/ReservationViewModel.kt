package com.mesaflow.client.feature.reservation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.AuthRepository
import com.mesaflow.client.core.data.ReservationRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.Reservation
import com.mesaflow.client.core.model.ReservationStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ReservationUiState(
    val isLoading: Boolean = false,
    /** null hasta la primera respuesta: no confundir con "no hay reserva" (ver [hasChecked]). */
    val hasChecked: Boolean = false,
    val reservation: Reservation? = null,
    val error: AppError? = null,
)

/**
 * Gestiona la reserva propia del cliente: crearla, consultar su estado y
 * cancelarla. No hay listado (ver [ReservationRepository]), así que esta
 * pantalla solo conoce la reserva que ella misma creó (persistida en
 * ReservationStore) o ninguna.
 */
@HiltViewModel
class ReservationViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionStore: SessionStore,
    private val reservationRepository: ReservationRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReservationUiState())
    val uiState: StateFlow<ReservationUiState> = _uiState.asStateFlow()

    private var restaurantId: String? = null

    init {
        viewModelScope.launch {
            val existing = reservationRepository.refreshOwnReservation()
            if (existing == null) {
                _uiState.update { it.copy(hasChecked = true) }
            } else {
                applyResult(existing)
            }
        }
    }

    fun createReservation(
        customerName: String,
        customerPhone: String?,
        partySize: Int,
        reservationAt: String,
        notes: String?,
        paymentMethod: PaymentMethod,
    ) {
        if (_uiState.value.isLoading) return
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            when (val idResult = ensureRestaurantId()) {
                is AppResult.Error -> _uiState.update {
                    it.copy(isLoading = false, hasChecked = true, error = idResult.error)
                }
                is AppResult.Success -> {
                    val result = reservationRepository.create(
                        restaurantId = idResult.data,
                        customerName = customerName,
                        customerPhone = customerPhone,
                        partySize = partySize,
                        reservationAt = reservationAt,
                        notes = notes,
                        paymentMethod = paymentMethod,
                    )
                    applyResult(result)
                }
            }
        }
    }

    fun cancelReservation() {
        if (_uiState.value.isLoading) return
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            val result = reservationRepository.cancelOwnReservation()
            if (result == null) {
                _uiState.update { it.copy(isLoading = false) }
                return@launch
            }
            applyResult(result)
        }
    }

    fun onErrorShown() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Reutiliza la sesión activa si existe; si no, inicia sesión con el rol
     * `customer`. Propaga el [AppError] real (red, servidor, etc.) en vez de
     * colapsar cualquier fallo en `Unauthorized`: antes, un demo-login que
     * fallaba por ejemplo por falta de red se mostraba igual que una sesión
     * caducada, ocultando la causa real del error.
     */
    private suspend fun ensureRestaurantId(): AppResult<String> {
        restaurantId?.let { return AppResult.Success(it) }
        val session = when (val stored = sessionStore.currentSession()) {
            null -> when (val login = authRepository.demoLogin()) {
                is AppResult.Success -> login.data
                is AppResult.Error -> return AppResult.Error(login.error)
            }
            else -> stored
        }
        val id = session.restaurantScopes.firstOrNull()
            ?: return AppResult.Error(AppError.Unauthorized)
        restaurantId = id
        return AppResult.Success(id)
    }

    private fun applyResult(result: AppResult<Reservation>) {
        when (result) {
            is AppResult.Success -> _uiState.update {
                it.copy(isLoading = false, hasChecked = true, reservation = result.data)
            }
            is AppResult.Error -> _uiState.update {
                it.copy(isLoading = false, hasChecked = true, error = result.error)
            }
        }
    }
}

/** true si la reserva ya no ocupa mesa (cancelada o no-show): la UI puede ofrecer crear una nueva. */
val Reservation.isClosed: Boolean
    get() = status == ReservationStatus.CANCELLED || status == ReservationStatus.NO_SHOW
