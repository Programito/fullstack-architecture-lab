package com.mesaflow.client.feature.cart

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.ViewModel
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.data.OrderRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.OrderLineKitchenStatus
import com.mesaflow.client.core.model.ServicePointOrderStatus
import com.mesaflow.client.core.model.SubmittedOrder
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** Estado del envío del pedido; las líneas llegan aparte como flow del carrito. */
data class CartUiState(
    val isSubmitting: Boolean = false,
    val submitError: AppError? = null,
    val submitted: SubmittedOrder? = null,
    /** Progreso en cocina del pedido ya enviado; ver [CartViewModel.startOrderStatusPolling]. */
    val orderStatus: ServicePointOrderStatus? = null,
    /**
     * Foto de las líneas justo antes de enviarlas: el carrito real se vacía en cuanto el envío
     * tiene éxito, así que es la única fuente para el ticket detallado en Cobro/Pago aceptado.
     */
    val submittedLines: List<CartLine> = emptyList(),
    /** Mesa del pedido enviado, para mostrarla en el ticket (mismo valor que usa la Carta). */
    val tableLabel: String = "",
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

    private var pollJob: Job? = null

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
            // Foto de las líneas ANTES de enviar: submitCart() vacía el carrito real en cuanto
            // el envío tiene éxito, así que lines.value ya no serviría después del await.
            val linesSnapshot = lines.value
            when (val result = orderRepository.submitCart(table.restaurantId, table.tableId, linesSnapshot)) {
                is AppResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            submitted = result.data,
                            submittedLines = linesSnapshot,
                            tableLabel = table.tableId,
                        )
                    }
                    startOrderStatusPolling(table.restaurantId, table.tableId)
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(isSubmitting = false, submitError = result.error)
                }
            }
        }
    }

    /**
     * Sondea el estado del pedido cada [ORDER_STATUS_POLL_INTERVAL_MS] mientras
     * el cliente ve la pantalla de "pedido enviado". No hay push real (la app
     * no tiene cliente WebSocket a proposito: el hosting gratuito del backend
     * no ofrece sockets fiables); el backend SI expone el estado por linea
     * (`GetRestaurantServicePointOrderUseCase`), asi que un sondeo corto es
     * la forma mas simple de dar feedback casi en vivo. Pensado para no
     * castigar al backend gratuito:
     * - solo corre con la app en primer plano (ProcessLifecycleOwner, igual
     *   que el refresco periodico de la carta en MenuViewModel);
     * - se detiene del todo cuando todas las lineas llegan a un estado final
     *   (servido/cancelado): ya no queda nada que actualizar;
     * - la respuesta viaja con ETag + Cache-Control, asi que las vueltas sin
     *   cambios son un 304 sin cuerpo (ver NetworkModule);
     * - un fallo puntual de red no interrumpe el sondeo (se reintenta en la
     *   siguiente vuelta); el job muere al limpiarse el ViewModel ([onCleared]).
     */
    private fun startOrderStatusPolling(restaurantId: String, tableId: String) {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            ProcessLifecycleOwner.get().lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (isActive) {
                    when (val result = orderRepository.getServicePointOrder(restaurantId, tableId)) {
                        is AppResult.Success -> {
                            _uiState.update { it.copy(orderStatus = result.data) }
                            val lines = result.data.lines
                            if (lines.isNotEmpty() && lines.all { it.status.isFinal() }) {
                                pollJob?.cancel()
                                return@repeatOnLifecycle
                            }
                        }
                        is AppResult.Error -> Unit
                    }
                    delay(ORDER_STATUS_POLL_INTERVAL_MS)
                }
            }
        }
    }

    /** Estados desde los que una linea ya no cambia: no justifican seguir sondeando. */
    private fun OrderLineKitchenStatus.isFinal(): Boolean =
        this == OrderLineKitchenStatus.SERVED || this == OrderLineKitchenStatus.CANCELLED

    override fun onCleared() {
        pollJob?.cancel()
    }

    private companion object {
        const val ORDER_STATUS_POLL_INTERVAL_MS = 4_000L
    }
}
