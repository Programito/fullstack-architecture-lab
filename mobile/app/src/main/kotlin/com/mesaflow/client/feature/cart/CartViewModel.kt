package com.mesaflow.client.feature.cart

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.data.MenuRepository
import com.mesaflow.client.core.data.OrderRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.SubmittedOrder
import com.mesaflow.client.core.model.isConfigurable
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
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Estado del envío del pedido; las líneas llegan aparte como flow del carrito. */
data class CartUiState(
    val isSubmitting: Boolean = false,
    val submitError: AppError? = null,
    val submitted: SubmittedOrder? = null,
    /** Total ya abierto en backend para esta mesa, si existe un pedido activo. */
    val activeTableTotalCents: Long = 0L,
    /** Moneda del pedido activo de mesa, para cuadrar el total pagable en UI. */
    val activeTableCurrency: String = "EUR",
    /**
     * Foto de las líneas justo antes de enviarlas: el carrito real se vacía en cuanto el envío
     * tiene éxito, así que es la única fuente para el ticket detallado en Cobro/Pago aceptado.
     */
    val submittedLines: List<CartLine> = emptyList(),
    /** Mesa del pedido enviado, para mostrarla en el ticket (mismo valor que usa la Carta). */
    val tableLabel: String = "",
    /** Línea que se está editando (null = configurador cerrado). */
    val editingLine: CartLine? = null,
    /** Producto de la carta correspondiente a [editingLine], para reabrir el configurador. */
    val editingItem: MenuItem? = null,
)

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
    private val sessionStore: SessionStore,
    private val menuRepository: MenuRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CartUiState())
    val uiState: StateFlow<CartUiState> = _uiState.asStateFlow()

    /** Líneas del carrito del restaurante actual, en vivo desde Room. */
    val lines: StateFlow<List<CartLine>> = sessionStore.tableContext
        .filterNotNull()
        .flatMapLatest { table -> cartRepository.cart(table.restaurantId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    /**
     * id de MenuItem -> MenuItem de la carta actual (misma cache en memoria que usa la Carta,
     * vía [MenuRepository]). Se usa para saber, por línea, si hay algo que editar (tamaño,
     * extras, combo...) y para reabrir el configurador con los datos frescos del producto.
     */
    // Publico (no private) y con collectAsStateWithLifecycle en CartScreen: asi la UI
    // recompone en cuanto la carta termina de cargar. Ademas Eagerly (no WhileSubscribed):
    // arranca solo, sin depender de que algo lo suscriba.
    val menuItemsById: StateFlow<Map<String, MenuItem>> = sessionStore.tableContext
        .filterNotNull()
        .map { table -> (menuRepository.getMenu(table.restaurantId) as? AppResult.Success)?.data }
        .map { menu -> menu?.sections.orEmpty().flatMap { it.items }.associateBy { it.id } }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyMap())

    init {
        viewModelScope.launch {
            lines.collect { liveLines ->
                _uiState.update { reconcileCartUiStateWithLines(it, liveLines) }
            }
        }
        viewModelScope.launch {
            sessionStore.tableContext
                .filterNotNull()
                .collect { table ->
                    when (val result = orderRepository.getServicePointOrder(table.restaurantId, table.tableId)) {
                        is AppResult.Success -> _uiState.update {
                            it.copy(
                                activeTableTotalCents = result.data.totalCents,
                                activeTableCurrency = result.data.currency,
                            )
                        }
                        is AppResult.Error -> _uiState.update {
                            it.copy(activeTableTotalCents = 0L, activeTableCurrency = "EUR")
                        }
                    }
                }
        }
    }

    fun onQuantityChange(lineId: Long, quantity: Int) {
        viewModelScope.launch { cartRepository.updateQuantity(lineId, quantity) }
    }

    fun onRemoveLine(lineId: Long) {
        viewModelScope.launch { cartRepository.remove(lineId) }
    }

    fun onErrorShown() {
        _uiState.update { it.copy(submitError = null) }
    }

    fun onClearCart() {
        viewModelScope.launch {
            val table = sessionStore.tableContext.first() ?: return@launch
            cartRepository.clear(table.restaurantId)
        }
    }

    /** Abre el configurador para editar [line]; no hace nada si el producto ya no está en la carta. */
    fun onEditLine(line: CartLine) {
        val item = menuItemsById.value[line.menuItemId] ?: return
        _uiState.update { it.copy(editingLine = line, editingItem = item) }
    }

    fun onEditDismiss() {
        _uiState.update { it.copy(editingLine = null, editingItem = null) }
    }

    /** Guarda la nueva configuración de [CartUiState.editingLine] (fusiona si coincide con otra línea). */
    fun onEditConfirm(updated: CartLine) {
        val lineId = _uiState.value.editingLine?.id ?: return
        viewModelScope.launch {
            val table = sessionStore.tableContext.first() ?: return@launch
            cartRepository.updateLine(table.restaurantId, lineId, updated)
            _uiState.update { it.copy(editingLine = null, editingItem = null) }
        }
    }

    /** Prepara el pedido y deja el envío real a cocina para el momento del pago. */
    fun onSubmit() {
        if (_uiState.value.isSubmitting || (_uiState.value.submitted != null && lines.value.isEmpty())) return
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
                            activeTableTotalCents = result.data.totalCents,
                            activeTableCurrency = result.data.currency,
                            submittedLines = linesSnapshot,
                            tableLabel = table.tableId,
                        )
                    }
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(isSubmitting = false, submitError = result.error)
                }
            }
        }
    }
}
