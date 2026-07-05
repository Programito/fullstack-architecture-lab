package com.mesaflow.client.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.mesaflow.client.feature.entry.EntryScreen
import com.mesaflow.client.feature.menu.MenuScreen

/**
 * Arbol de navegacion (Navigation 3): el back stack es estado propio.
 * Entry -> Menu reemplaza el stack (no se vuelve "atras" al login);
 * sessionExpired vacia el stack y devuelve a Entry.
 */
@Composable
fun MesaFlowNavigation(viewModel: MainViewModel = viewModel()) {
    val backStack = rememberNavBackStack(EntryKey)

    LaunchedEffect(Unit) {
        viewModel.sessionExpired.collect {
            backStack.clear()
            backStack.add(EntryKey)
        }
    }

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = entryProvider {
            entry<EntryKey> {
                EntryScreen(
                    onEnter = {
                        backStack.clear()
                        backStack.add(MenuKey)
                    },
                )
            }
            entry<MenuKey> {
                MenuScreen()
            }
        },
    )
}
