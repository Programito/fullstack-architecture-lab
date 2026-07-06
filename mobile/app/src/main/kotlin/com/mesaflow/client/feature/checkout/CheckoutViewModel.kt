package com.mesaflow.client.feature.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.OrderRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.PaymentResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CheckoutUiState(
    val method: PaymentMethod = PaymentMethod.CARD,
    val isProcessing: Boolean = false,
    val error: AppError? = null,
    val result: PaymentResult? = null,
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
) : ViewModel() {

    private val _uiState = MutableStateFlow(CheckoutUiState())
    val uiState: StateFlow<CheckoutUiState> = _uiState.asStateFlow()

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
                    it.copy(isProcessing = false, result = result.data)
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(isProcessing = false, error = result.error)
                }
            }
        }
    }

    private companion object {
        const val MOCK_GATEWAY_DELAY_MS = 1_200L
    }
}
