package com.mesaflow.client.core.designsystem

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp

/**
 * Clasificacion de ancho de ventana (mismos breakpoints que Material3
 * `WindowWidthSizeClass`): `Compact` (<600dp, movil en vertical), `Medium`
 * (600-839dp, movil apaisado o tablet pequena en vertical) y `Expanded`
 * (>=840dp, tablet). Se calcula a partir de `LocalConfiguration.screenWidthDp`
 * en vez de depender de `material3-window-size-class` o `androidx.window`
 * (evita anadir una dependencia nueva solo para esto, y ambas librerias usan
 * los mismos umbrales) — ver
 * docs/superpowers/plans/2026-07-12-tablet-adaptive-ui.md, Fase 0 Paso 2.
 *
 * Se calcula una unica vez en `MainActivity` y se propaga hacia abajo via
 * [LocalWindowWidthSizeClass] (`CompositionLocal`) en vez de como parametro
 * de cada pantalla, para no tener que tocar `MesaFlowNavigation`/`NavKeys`
 * ni la firma de las pantallas existentes.
 */
enum class WindowWidthSizeClass {
    Compact,
    Medium,
    Expanded,
}

private const val MEDIUM_WIDTH_BREAKPOINT_DP = 600
private const val EXPANDED_WIDTH_BREAKPOINT_DP = 840

@Composable
fun rememberWindowWidthSizeClass(): WindowWidthSizeClass {
    val widthDp = LocalConfiguration.current.screenWidthDp
    return when {
        widthDp >= EXPANDED_WIDTH_BREAKPOINT_DP -> WindowWidthSizeClass.Expanded
        widthDp >= MEDIUM_WIDTH_BREAKPOINT_DP -> WindowWidthSizeClass.Medium
        else -> WindowWidthSizeClass.Compact
    }
}

/**
 * Valor por defecto `Compact`: cualquier `@Preview`/test que no envuelva
 * explicitamente con `CompositionLocalProvider` se comporta como movil,
 * igual que el codigo de hoy sin este cambio.
 */
val LocalWindowWidthSizeClass: ProvidableCompositionLocal<WindowWidthSizeClass> =
    staticCompositionLocalOf { WindowWidthSizeClass.Compact }

/**
 * Ancho maximo comodo de lectura para contenido de formulario largo (Carrito, Cobro, Ajustes)
 * cuando hay mucho ancho disponible en tablet — ver
 * docs/superpowers/plans/2026-07-12-tablet-adaptive-ui.md, Fase 2.
 */
private const val EXPANDED_CONTENT_MAX_WIDTH_DP = 640

/**
 * En `Expanded` acota el ancho a un maximo comodo (el contenido queda centrado por el `Box`
 * padre que lo envuelva); en `Compact`/`Medium` estira a todo el ancho disponible, exactamente
 * igual que el codigo de hoy sin este cambio.
 */
fun Modifier.expandedContentMaxWidth(windowWidthSizeClass: WindowWidthSizeClass): Modifier =
    if (windowWidthSizeClass == WindowWidthSizeClass.Expanded) {
        this.widthIn(max = EXPANDED_CONTENT_MAX_WIDTH_DP.dp)
    } else {
        this.fillMaxWidth()
    }
