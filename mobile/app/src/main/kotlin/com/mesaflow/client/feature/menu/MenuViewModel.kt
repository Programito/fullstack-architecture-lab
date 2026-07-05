package com.mesaflow.client.feature.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mesaflow.client.core.datastore.SessionStore
import com.mesaflow.client.core.model.Session
import com.mesaflow.client.core.model.TableContext
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

data class MenuUiState(
    val session: Session? = null,
    val table: TableContext? = null,
)

@HiltViewModel
class MenuViewModel @Inject constructor(
    sessionStore: SessionStore,
) : ViewModel() {

    val uiState: StateFlow<MenuUiState> =
        combine(sessionStore.session, sessionStore.tableContext) { session, table ->
            MenuUiState(session = session, table = table)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MenuUiState())
}
