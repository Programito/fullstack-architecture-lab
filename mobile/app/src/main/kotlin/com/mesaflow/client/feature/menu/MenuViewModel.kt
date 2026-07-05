package com.mesaflow.client.feature.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.data.MenuRepository
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.Menu
import com.mesaflow.client.core.model.MenuSection
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface MenuContentState {
    data object Loading : MenuContentState
    data class Error(val error: AppError) : MenuContentState
    data class Ready(val menu: Menu) : MenuContentState
}

data class MenuUiState(
    val content: MenuContentState = MenuContentState.Loading,
    val tableLabel: String = "",
    val query: String = "",
    val selectedSectionId: String? = null,
) {
    /** Secciones tras aplicar buscador y categoria. */
    val filteredSections: List<MenuSection>
        get() = (content as? MenuContentState.Ready)
            ?.let { MenuFilter.filter(it.menu.sections, query, selectedSectionId) }
            .orEmpty()
}

@HiltViewModel
class MenuViewModel @Inject constructor(
    private val menuRepository: MenuRepository,
    private val sessionStore: SessionStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MenuUiState())
    val uiState: StateFlow<MenuUiState> = _uiState.asStateFlow()

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
}
