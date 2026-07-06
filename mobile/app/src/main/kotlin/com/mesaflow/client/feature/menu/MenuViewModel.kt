package com.mesaflow.client.feature.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.data.MenuRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.Menu
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.MenuSection
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

sealed interface MenuContentState {
    data object Loading : MenuContentState
    data class Error(val error: AppError) : MenuContentState
    data class Ready(val menu: Menu) : MenuContentState
}

/** Resumen del carrito para la barra inferior de la carta. */
data class CartSummary(
    val itemCount: Int = 0,
    val totalCents: Long = 0L,
    val currency: String = "EUR",
) {
    val isEmpty: Boolean get() = itemCount == 0
}

data class MenuUiState(
    val content: MenuContentState = MenuContentState.Loading,
    val tableLabel: String = "",
    val query: String = "",
    val selectedSectionId: String? = null,
    /** Producto abierto en el configurador (null = cerrado). */
    val configuringItem: MenuItem? = null,
) {
    /** Secciones tras aplicar buscador y categoria. */
    val filteredSections: List<MenuSection>
        get() = (content as? MenuContentState.Ready)
            ?.let { MenuFilter.filter(it.menu.sections, query, selectedSectionId) }
            .orEmpty()
}

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class MenuViewModel @Inject constructor(
    private val menuRepository: MenuRepository,
    private val sessionStore: SessionStore,
    private val cartRepository: CartRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MenuUiState())
    val uiState: StateFlow<MenuUiState> = _uiState.asStateFlow()

    /** Nº de artículos y total del carrito del restaurante actual, en vivo. */
    val cartSummary: StateFlow<CartSummary> = sessionStore.tableContext
        .filterNotNull()
        .flatMapLatest { table -> cartRepository.cart(table.restaurantId) }
        .map { lines ->
            CartSummary(
                itemCount = lines.sumOf { it.quantity },
                totalCents = lines.sumOf { it.totalCents },
                currency = lines.firstOrNull()?.currency ?: "EUR",
            )
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), CartSummary())

    init {
        load()
    }

    fun load(forceRefresh: Boolean = false) {
        _uiState.update { it.copy(content = MenuContentState.Loading) }
        viewModelScope.launch {
            val table = sessionStore.tableContext.first()
            if (table == null) {
                _uiState.update { it.copy(content = MenuContentState.Error(AppError.Unknown(null))) }
                return@launch
            }
            _uiState.update { it.copy(tableLabel = table.tableId) }
            when (val result = menuRepository.getMenu(table.restaurantId, forceRefresh)) {
                is AppResult.Success -> _uiState.update {
                    it.copy(content = MenuContentState.Ready(result.data))
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(content = MenuContentState.Error(result.error))
                }
            }
        }
    }

    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }
    }

    fun onSectionSelected(sectionId: String?) {
        _uiState.update { it.copy(selectedSectionId = sectionId) }
    }

    /** Abre el configurador para un producto disponible. */
    fun onItemClick(item: MenuItem) {
        if (!item.isAvailable) return
        _uiState.update { it.copy(configuringItem = item) }
    }

    fun onConfiguratorDismiss() {
        _uiState.update { it.copy(configuringItem = null) }
    }

    /** Guarda la línea configurada en el carrito y cierra el configurador. */
    fun onAddToCart(line: CartLine) {
        viewModelScope.launch {
            val table = sessionStore.tableContext.first() ?: return@launch
            cartRepository.add(table.restaurantId, line)
            _uiState.update { it.copy(configuringItem = null) }
        }
    }
}
