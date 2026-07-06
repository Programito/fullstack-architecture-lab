package com.mesaflow.client.feature.cart

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.data.OrderRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.SubmittedOrder
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Estado del envío del pedido; las líneas llegan aparte como flow del carrito. */
data class CartUiState(
    val isSubmitting: Boolean = false,
    val submitError: AppError? = null,
    val submitted: SubmittedOrder? = null,
)

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
    private val sessionStore: SessionStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CartUiState())
    val uiState: StateFlow<CartUiState> = _uiState.asStateFlow()

    /** Líneas del carrito del restaurante actual, en vivo desde Room. */
    val lines: StateFlow<List<CartLine>> = sessionStore.tableContext
        .filterNotNull()
        .flatMapLatest { table -> cartRepository.cart(table.restaurantId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun onQuantityChange(lineId: Long, quantity: Int) {
        viewModelScope.launch { cartRepository.updateQuantity(lineId, quantity) }
    }

    fun onRemoveLine(lineId: Long) {
        viewModelScope.launch { cartRepository.remove(lineId) }
    }

    fun onErrorShown() {
        _uiState.update { it.copy(submitError = null) }
    }

    /** Envía el carrito como pedido de la mesa actual. */
    fun onSubmit() {
        if (_uiState.value.isSubmitting || _uiState.value.submitted != null) return
        _uiState.update { it.copy(isSubmitting = true, submitError = null) }

        viewModelScope.launch {
            val table = sessionStore.tableContext.first()
            if (table == null) {
                _uiState.update { it.copy(isSubmitting = false, submitError = AppError.Unknown(null)) }
                return@launch
            }
            when (val result = orderRepository.submitCart(table.restaurantId, table.tableId, lines.value)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(isSubmitting = false, submitted = result.data)
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(isSubmitting = false, submitError = result.error)
                }
            }
        }
    }
}
