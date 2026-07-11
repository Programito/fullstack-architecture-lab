package com.mesaflow.client.feature.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.AuthRepository
import com.mesaflow.client.core.data.OrderRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.PaymentResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CheckoutUiState(
    val method: PaymentMethod = PaymentMethod.CARD,
    val isProcessing: Boolean = false,
    val error: AppError? = null,
    val result: PaymentResult? = null,
    /**
     * Hora local (epoch millis) en la que el pago se registró con éxito, para
     * mostrarla en el ticket. No hay kotlinx-datetime en el proyecto, así que
     * se sella con System.currentTimeMillis() y se formatea con java.time en la UI.
     */
    val paidAtMillis: Long? = null,
)

/**
 * Cobro del pedido. La pasarela es mock (retardo simulado, sin datos de
 * tarjeta reales); el registro del pago en el backend sí es real, para que
 * el POS del restaurante vea el pedido como pagado.
 */
@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val sessionStore: SessionStore,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CheckoutUiState())
    val uiState: StateFlow<CheckoutUiState> = _uiState.asStateFlow()

    /**
     * Señal de "mesa abandonada" tras el pago: mismo patrón que
     * SettingsViewModel.exitTable (logout primero, después navegar).
     */
    private val _exitTable = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val exitTable: SharedFlow<Unit> = _exitTable.asSharedFlow()

    fun onMethodSelected(method: PaymentMethod) {
        if (_uiState.value.isProcessing) return
        _uiState.update { it.copy(method = method) }
    }

    fun onErrorShown() {
        _uiState.update { it.copy(error = null) }
    }

    fun onPay(orderId: String, amountCents: Long) {
        if (_uiState.value.isProcessing || _uiState.value.result != null) return
        _uiState.update { it.copy(isProcessing = true, error = null) }

        viewModelScope.launch {
            // Pasarela mock: simula el tiempo de autorización del pago.
            delay(MOCK_GATEWAY_DELAY_MS)

            val table = sessionStore.tableContext.first()
            if (table == null) {
                _uiState.update { it.copy(isProcessing = false, error = AppError.Unknown(null)) }
                return@launch
            }
            val result = orderRepository.pay(
                restaurantId = table.restaurantId,
                orderId = orderId,
                amountCents = amountCents,
                method = _uiState.value.method,
            )
            when (result) {
                is AppResult.Success -> _uiState.update {
                    it.copy(
                        isProcessing = false,
                        result = result.data,
                        paidAtMillis = System.currentTimeMillis(),
                    )
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(isProcessing = false, error = result.error)
                }
            }
        }
    }

    /**
     * "Salir de la mesa" desde la pantalla de pago aceptado: cierra la sesión
     * de mesa (logout) y emite [exitTable] para que la navegación vuelva a Entry,
     * igual que hace Ajustes con SettingsViewModel.onExitTableConfirmed().
     */
    fun onExitTableRequested() {
        viewModelScope.launch {
            authRepository.logout()
            _exitTable.tryEmit(Unit)
        }
    }

    private companion object {
        const val MOCK_GATEWAY_DELAY_MS = 1_200L
    }
}
