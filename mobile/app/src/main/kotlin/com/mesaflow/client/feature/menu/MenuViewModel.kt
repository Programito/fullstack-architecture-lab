package com.mesaflow.client.feature.menu

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.ViewModel
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.common.resolveLocaleTag
import com.mesaflow.client.core.common.withResolvedNames
import com.mesaflow.client.core.data.CartRepository
import com.mesaflow.client.core.data.MenuRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.datastore.SettingsStore
import com.mesaflow.client.core.model.Allergen
import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.Menu
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.MenuSection
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
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
import kotlin.time.Duration.Companion.minutes

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
    /** Alergenos que el cliente quiere evitar; oculta cualquier item que los declare. */
    val excludedAllergens: Set<Allergen> = emptySet(),
    /** Producto abierto en el configurador (null = cerrado). */
    val configuringItem: MenuItem? = null,
    /**
     * true si el refresco periódico detectó una carta distinta mientras el cliente
     * la estaba mirando; se muestra un aviso y el cambio se aplica solo al tocarlo
     * (repintar la lista bajo el dedo sería molesto).
     */
    val updatedMenuNotice: Boolean = false,
) {
    /** Secciones tras aplicar buscador, categoria y alergenos a evitar. */
    val filteredSections: List<MenuSection>
        get() = (content as? MenuContentState.Ready)
            ?.let { MenuFilter.filter(it.menu.sections, query, selectedSectionId, excludedAllergens) }
            .orEmpty()
}

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class MenuViewModel @Inject constructor(
    private val menuRepository: MenuRepository,
    private val sessionStore: SessionStore,
    private val cartRepository: CartRepository,
    private val settingsStore: SettingsStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MenuUiState())
    val uiState: StateFlow<MenuUiState> = _uiState.asStateFlow()

    /**
     * Carta nueva detectada por el refresco periódico y aún no aplicada (el cliente
     * estaba mirando la lista); se aplica al tocar el aviso "La carta se ha actualizado".
     */
    private var pendingMenu: Menu? = null

    /**
     * Ultima carta cruda recibida del backend (con `name` canonico en castellano y
     * `nameI18n` sin resolver). Se guarda aparte del `_uiState.content` porque este ultimo
     * ya lleva los nombres resueltos al idioma activo — reresolver al cambiar de idioma
     * necesita partir siempre de los datos crudos, no de una resolucion anterior.
     */
    private var rawMenu: Menu? = null

    /** Idioma activo resuelto (es/ca/en), actualizado por [observeLanguage]. */
    private var currentLocaleTag: String = AppLanguage.SYSTEM.resolveLocaleTag()

    /** true mientras la pantalla de la carta está en composición (no tapada por Carrito/Ajustes). */
    private val menuScreenVisible = MutableStateFlow(false)

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

    /**
     * true si el último intento de enviar el pedido de este restaurante
     * falló y no se ha reintentado con éxito (ver CartRepository/OrderRepository).
     * La Carta la usa para avisar aunque el cliente haya vuelto sin
     * reintentar desde el Snackbar del Carrito.
     */
    val hasPendingSubmissionIssue: StateFlow<Boolean> = sessionStore.tableContext
        .filterNotNull()
        .flatMapLatest { table -> cartRepository.hasFailedSubmission(table.restaurantId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    init {
        load()
        startMenuPolling()
        observeLanguage()
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
                is AppResult.Success -> {
                    // Una recarga manual deja la carta al día: cualquier aviso pendiente ya no aplica.
                    pendingMenu = null
                    applyMenu(result.data, notice = false)
                }
                is AppResult.Error -> _uiState.update {
                    it.copy(content = MenuContentState.Error(result.error))
                }
            }
        }
    }

    /**
     * Reacciona a cambios del idioma activo (Ajustes) reresolviendo los nombres de la carta ya
     * cargada, sin volver a pedirla a red: los datos de las tres variantes ya viajaron en la
     * ultima respuesta 200/304 y solo hace falta recalcular que variante pintar.
     */
    private fun observeLanguage() {
        viewModelScope.launch {
            settingsStore.language.collect { language ->
                currentLocaleTag = language.resolveLocaleTag()
                rawMenu?.let { menu ->
                    _uiState.update { it.copy(content = MenuContentState.Ready(menu.withResolvedNames(currentLocaleTag))) }
                }
            }
        }
    }

    /**
     * Refresco periódico de la carta: el admin web puede reordenar productos o cambiar precios
     * en cualquier momento y no hay push (hosting sin websockets fiables), así que cada
     * [MENU_POLL_INTERVAL] se repide la carta y se compara con la actual. Solo corre con la app
     * en primer plano (ProcessLifecycleOwner): en background no gasta batería ni mantiene
     * despierta la base de datos del hosting gratuito.
     */
    private fun startMenuPolling() {
        viewModelScope.launch {
            ProcessLifecycleOwner.get().lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (true) {
                    delay(MENU_POLL_INTERVAL)
                    pollMenuOnce()
                }
            }
        }
    }

    private suspend fun pollMenuOnce() {
        val table = sessionStore.tableContext.first() ?: return
        // Si la carta aún carga o está en error, manda el flujo normal de load()/Reintentar.
        if (rawMenu == null) return
        val result = menuRepository.getMenu(table.restaurantId, forceRefresh = true)
        // Un fallo del polling nunca debe volcar la pantalla a Error: se reintenta al siguiente ciclo.
        val fresh = (result as? AppResult.Success)?.data ?: return

        if (fresh == rawMenu) {
            // El admin pudo deshacer el cambio antes de que el cliente tocara el aviso.
            pendingMenu = null
            _uiState.update { it.copy(updatedMenuNotice = false) }
            return
        }
        if (menuScreenVisible.value) {
            pendingMenu = fresh
            _uiState.update { it.copy(updatedMenuNotice = true) }
        } else {
            // Con la carta tapada (Carrito/Ajustes) se aplica en silencio: al volver ya está al día.
            applyMenu(fresh, notice = false)
        }
    }

    /**
     * Aplica una carta cruda nueva: guarda el original (para poder reresolver si cambia el idioma
     * mas tarde sin red) y publica en `_uiState` la version ya resuelta al idioma activo,
     * conservando búsqueda y alérgenos; resetea el chip si su sección ya no existe.
     */
    private fun applyMenu(menu: Menu, notice: Boolean) {
        pendingMenu = null
        rawMenu = menu
        val resolved = menu.withResolvedNames(currentLocaleTag)
        _uiState.update { state ->
            val sectionStillExists = resolved.sections.any { it.id == state.selectedSectionId }
            state.copy(
                content = MenuContentState.Ready(resolved),
                selectedSectionId = state.selectedSectionId?.takeIf { sectionStillExists },
                updatedMenuNotice = notice,
            )
        }
    }

    /** La pantalla de la carta informa de si está visible (DisposableEffect en MenuScreen). */
    fun onMenuScreenVisibilityChange(visible: Boolean) {
        menuScreenVisible.value = visible
    }

    /** Tap en "La carta se ha actualizado": aplica la carta pendiente. */
    fun onMenuUpdatedNoticeClick() {
        pendingMenu?.let { applyMenu(it, notice = false) }
    }

    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }
    }

    fun onSectionSelected(sectionId: String?) {
        _uiState.update { it.copy(selectedSectionId = sectionId) }
    }

    /** Añade o quita [allergen] del conjunto a evitar. */
    fun onAllergenToggled(allergen: Allergen) {
        _uiState.update { state ->
            val current = state.excludedAllergens
            state.copy(excludedAllergens = if (allergen in current) current - allergen else current + allergen)
        }
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

    companion object {
        /**
         * Cada cuánto se comprueba si la carta cambió en el backend. 3 min equilibra
         * ver los cambios "durante la misma comida" con no castigar batería/BD gratuita.
         */
        private val MENU_POLL_INTERVAL = 3.minutes
    }
}
