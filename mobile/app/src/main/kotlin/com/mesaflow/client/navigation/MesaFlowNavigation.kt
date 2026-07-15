package com.mesaflow.client.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.mesaflow.client.feature.cart.CartScreen
import com.mesaflow.client.feature.checkout.CheckoutScreen
import com.mesaflow.client.feature.entry.EntryScreen
import com.mesaflow.client.feature.menu.MenuScreen
import com.mesaflow.client.feature.settings.SettingsScreen
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val TRANSITION_DURATION_MS = 220

/**
 * Arbol de navegacion (Navigation 3): el back stack es estado propio.
 * Entry -> Menu reemplaza el stack (no se vuelve "atras" al login);
 * sessionExpired vacia el stack y devuelve a Entry.
 * Las transiciones entre pantallas son un fundido + deslizamiento sutil,
 * coherente en ambas direcciones (avanzar hacia el inicio, volver hacia el final).
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
        transitionSpec = {
            fadeIn(tween(TRANSITION_DURATION_MS)) + slideIntoContainer(
                towards = AnimatedContentTransitionScope.SlideDirection.Start,
                animationSpec = tween(TRANSITION_DURATION_MS),
            ) togetherWith fadeOut(tween(TRANSITION_DURATION_MS))
        },
        popTransitionSpec = {
            fadeIn(tween(TRANSITION_DURATION_MS)) + slideIntoContainer(
                towards = AnimatedContentTransitionScope.SlideDirection.End,
                animationSpec = tween(TRANSITION_DURATION_MS),
            ) togetherWith fadeOut(tween(TRANSITION_DURATION_MS)) + slideOutOfContainer(
                towards = AnimatedContentTransitionScope.SlideDirection.End,
                animationSpec = tween(TRANSITION_DURATION_MS),
            )
        },
        predictivePopTransitionSpec = {
            fadeIn(tween(TRANSITION_DURATION_MS)) + slideIntoContainer(
                towards = AnimatedContentTransitionScope.SlideDirection.End,
                animationSpec = tween(TRANSITION_DURATION_MS),
            ) togetherWith fadeOut(tween(TRANSITION_DURATION_MS)) + slideOutOfContainer(
                towards = AnimatedContentTransitionScope.SlideDirection.End,
                animationSpec = tween(TRANSITION_DURATION_MS),
            )
        },
        entryProvider = entryProvider {
            entry<EntryKey> {
                EntryScreen(
                    onEnter = {
                        backStack.clear()
                        backStack.add(MenuKey)
                    },
                    onSettingsClick = { backStack.add(SettingsKey(fromEntry = true)) },
                )
            }
            entry<MenuKey> {
                MenuScreen(
                    onCartClick = { backStack.add(CartKey) },
                    onSettingsClick = { backStack.add(SettingsKey()) },
                )
            }
            entry<CartKey> {
                CartScreen(
                    onBack = { backStack.removeLastOrNull() },
                    onSettingsClick = { backStack.add(SettingsKey()) },
                    onCheckout = { submitted, lines, tableLabel ->
                        backStack.add(
                            CheckoutKey(
                                orderId = submitted.orderId,
                                subtotalCents = submitted.subtotalCents,
                                taxCents = submitted.taxCents,
                                totalCents = submitted.totalCents,
                                currency = submitted.currency,
                                linesJson = Json.encodeToString(lines),
                                dailyNumber = submitted.dailyNumber,
                                tableLabel = tableLabel,
                            ),
                        )
                    },
                )
            }
            entry<SettingsKey> { key ->
                SettingsScreen(
                    onBack = { backStack.removeLastOrNull() },
                    onExitTable = if (key.fromEntry) null else {
                        {
                            backStack.clear()
                            backStack.add(EntryKey)
                        }
                    },
                )
            }
            entry<CheckoutKey> { key ->
                CheckoutScreen(
                    orderId = key.orderId,
                    subtotalCents = key.subtotalCents,
                    taxCents = key.taxCents,
                    totalCents = key.totalCents,
                    currency = key.currency,
                    linesJson = key.linesJson,
                    dailyNumber = key.dailyNumber,
                    tableLabel = key.tableLabel,
                    onBack = {
                        backStack.removeLastOrNull()
                    },
                    onSettingsClick = { backStack.add(SettingsKey()) },
                    onDone = {
                        // Pago aceptado: vuelta limpia a la carta (sin carrito ni cobro detrás).
                        backStack.clear()
                        backStack.add(MenuKey)
                    },
                    onExitTable = {
                        // Igual que en Ajustes: vaciar el stack para que atrás no vuelva a la mesa cerrada.
                        backStack.clear()
                        backStack.add(EntryKey)
                    },
                )
            }
        },
    )
}
