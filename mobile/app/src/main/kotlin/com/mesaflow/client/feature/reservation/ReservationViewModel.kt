package com.mesaflow.client.feature.reservation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.AuthRepository
import com.mesaflow.client.core.data.ReservationRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.OwnReservationRef
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.Reservation
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ReservationUiState(
    val isLoading: Boolean = false,
    /** false hasta la primera respuesta: no confundir con "no hay reservas" (ver [reservations]). */
    val hasChecked: Boolean = false,
    /** Reservas propias activas (las cerradas se descartan al refrescar). */
    val reservations: List<Reservation> = emptyList(),
    /** true cuando el usuario ha pedido crear una reserva nueva teniendo ya otras activas. */
    val showForm: Boolean = false,
    val error: AppError? = null,
) {
    /** El formulario también es el estado vacío: sin reservas no hay lista que mostrar. */
    val isFormVisible: Boolean
        get() = showForm || (hasChecked && reservations.isEmpty())
}

/**
 * Gestiona las reservas propias del cliente: crearlas, consultar su estado y
 * cancelarlas una a una. No hay listado del restaurante (ver
 * [ReservationRepository]), así que esta pantalla solo conoce las reservas que
 * ella misma creó (persistidas en ReservationStore).
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
            when (val existing = withFreshSessionRetry { reservationRepository.refreshOwnReservations() }) {
                null -> _uiState.update { it.copy(hasChecked = true) }
                is AppResult.Success -> _uiState.update {
                    it.copy(hasChecked = true, reservations = existing.data)
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(hasChecked = true, error = existing.error)
                }
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
            val result = withFreshSessionRetry {
                when (val idResult = ensureRestaurantId()) {
                    is AppResult.Error -> AppResult.Error(idResult.error)
                    is AppResult.Success -> reservationRepository.create(
                        restaurantId = idResult.data,
                        customerName = customerName,
                        customerPhone = customerPhone,
                        partySize = partySize,
                        reservationAt = reservationAt,
                        notes = notes,
                        paymentMethod = paymentMethod,
                    )
                }
            }
            when (result) {
                is AppResult.Success -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        hasChecked = true,
                        reservations = it.reservations + result.data,
                        showForm = false,
                    )
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(isLoading = false, hasChecked = true, error = result.error)
                }
                null -> _uiState.update { it.copy(isLoading = false, hasChecked = true) }
            }
        }
    }

    fun cancelReservation(reservation: Reservation) {
        if (_uiState.value.isLoading) return
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            val ref = OwnReservationRef(restaurantId = reservation.restaurantId, reservationId = reservation.id)
            when (val result = withFreshSessionRetry { reservationRepository.cancelOwnReservation(ref) }) {
                is AppResult.Success -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        reservations = it.reservations.filterNot { r -> r.id == reservation.id },
                    )
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(isLoading = false, error = result.error)
                }
                null -> _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    /** El usuario quiere añadir otra reserva manteniendo las actuales. */
    fun openNewReservationForm() {
        _uiState.update { it.copy(showForm = true) }
    }

    /** Vuelve de la creación a la lista (solo tiene sentido si hay reservas que listar). */
    fun closeNewReservationForm() {
        _uiState.update { it.copy(showForm = false) }
    }

    fun onErrorShown() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Ejecuta [block] y, si falla con Unauthorized, hace un login demo fresco
     * y reintenta UNA vez. Cubre el caso de la sesión persistida muerta (la
     * cookie de refresh caducó o el backend se reinició): el TokenAuthenticator
     * ya limpia esa sesión al fallar el refresh, pero sin este reintento la
     * petición original se perdía — p. ej. enviabas una reserva, llegaba el
     * 401 y volvías al formulario como si no la hubieras creado.
     */
    private suspend fun <T> withFreshSessionRetry(block: suspend () -> AppResult<T>?): AppResult<T>? {
        val first = block()
        if (first !is AppResult.Error || first.error != AppError.Unauthorized) return first
        restaurantId = null
        return when (val login = authRepository.demoLogin()) {
            is AppResult.Error -> AppResult.Error(login.error)
            is AppResult.Success -> block()
        }
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
}
