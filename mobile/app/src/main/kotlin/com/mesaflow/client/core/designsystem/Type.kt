package com.mesaflow.client.core.designsystem

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp

/**
 * Tipografía MesaFlow: parte de la escala Material 3 por defecto y
 * refuerza los pesos de titulares para un aire más expresivo.
 * (Fase futura: fuente de marca propia vía FontFamily.)
 */
private val Default = Typography()

internal val MesaFlowTypography = Typography(
    displayLarge = Default.displayLarge.copy(fontWeight = FontWeight.Bold),
    displayMedium = Default.displayMedium.copy(fontWeight = FontWeight.Bold),
    displaySmall = Default.displaySmall.copy(fontWeight = FontWeight.Bold),
    headlineLarge = Default.headlineLarge.copy(fontWeight = FontWeight.SemiBold),
    headlineMedium = Default.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
    headlineSmall = Default.headlineSmall.copy(fontWeight = FontWeight.SemiBold),
    titleLarge = Default.titleLarge.copy(fontWeight = FontWeight.SemiBold),
    labelLarge = Default.labelLarge.copy(fontWeight = FontWeight.SemiBold, letterSpacing = 0.2.sp),
)

/** Estilo para precios: tabular para que los dígitos alineen en listas. */
internal val PriceTextStyle: TextStyle = Default.titleMedium.copy(fontWeight = FontWeight.Bold)
