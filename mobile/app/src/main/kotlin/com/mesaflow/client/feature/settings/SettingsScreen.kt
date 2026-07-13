package com.mesaflow.client.feature.settings

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mesaflow.client.R
import com.mesaflow.client.core.designsystem.LocalWindowWidthSizeClass
import com.mesaflow.client.core.designsystem.components.ExitTableConfirmDialog
import com.mesaflow.client.core.designsystem.expandedContentMaxWidth
import com.mesaflow.client.core.model.AppLanguage
import com.mesaflow.client.core.model.ThemeMode

/**
 * Ajustes de apariencia del cliente: tema e idioma. Preferencia local al
 * dispositivo (no hay cuenta de cliente final), persistida vía
 * [SettingsViewModel] / `SettingsStore` (DataStore).
 *
 * **Tablet (`Expanded`):** la lista de opciones se acota a un ancho máximo
 * cómodo y se centra, igual que Carrito/Cobro; en `Compact`/`Medium` no
 * cambia nada. Ver docs/superpowers/plans/2026-07-12-tablet-adaptive-ui.md,
 * Fase 2.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onExitTable: (() -> Unit)?,
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showExitTableConfirm by remember { mutableStateOf(false) }
    val windowWidthSizeClass = LocalWindowWidthSizeClass.current

    LaunchedEffect(onExitTable) {
        if (onExitTable == null) return@LaunchedEffect
        viewModel.exitTable.collect { onExitTable() }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.settings_back),
                        )
                    }
                },
            )
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.TopCenter,
        ) {
            Column(
                modifier = Modifier
                    .expandedContentMaxWidth(windowWidthSizeClass)
                    .padding(horizontal = 16.dp),
            ) {
                SettingsSection(title = stringResource(R.string.settings_theme_title)) {
                    SettingsOption(
                        label = stringResource(R.string.settings_theme_system),
                        selected = uiState.themeMode == ThemeMode.SYSTEM,
                        onClick = { viewModel.onThemeModeSelected(ThemeMode.SYSTEM) },
                    )
                    SettingsOption(
                        label = stringResource(R.string.settings_theme_light),
                        selected = uiState.themeMode == ThemeMode.LIGHT,
                        onClick = { viewModel.onThemeModeSelected(ThemeMode.LIGHT) },
                    )
                    SettingsOption(
                        label = stringResource(R.string.settings_theme_dark),
                        selected = uiState.themeMode == ThemeMode.DARK,
                        onClick = { viewModel.onThemeModeSelected(ThemeMode.DARK) },
                    )
                }

                SettingsSection(title = stringResource(R.string.settings_language_title)) {
                    SettingsOption(
                        label = stringResource(R.string.settings_language_system),
                        selected = uiState.language == AppLanguage.SYSTEM,
                        onClick = { viewModel.onLanguageSelected(AppLanguage.SYSTEM) },
                    )
                    SettingsOption(
                        label = stringResource(R.string.settings_language_es),
                        selected = uiState.language == AppLanguage.ES,
                        onClick = { viewModel.onLanguageSelected(AppLanguage.ES) },
                    )
                    SettingsOption(
                        label = stringResource(R.string.settings_language_en),
                        selected = uiState.language == AppLanguage.EN,
                        onClick = { viewModel.onLanguageSelected(AppLanguage.EN) },
                    )
                    SettingsOption(
                        label = stringResource(R.string.settings_language_ca),
                        selected = uiState.language == AppLanguage.CA,
                        onClick = { viewModel.onLanguageSelected(AppLanguage.CA) },
                    )
                }

                if (onExitTable != null) {
                    SettingsSection(title = stringResource(R.string.settings_table_title)) {
                        Text(
                            text = stringResource(R.string.settings_exit_table_hint),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = { showExitTableConfirm = true },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(stringResource(R.string.settings_exit_table_button))
                        }
                        Spacer(Modifier.height(12.dp))
                    }
                }
            }
        }
    }

    if (showExitTableConfirm && onExitTable != null) {
        ExitTableConfirmDialog(
            onDismiss = { showExitTableConfirm = false },
            onConfirm = {
                showExitTableConfirm = false
                viewModel.onExitTableConfirmed()
            },
        )
    }
}

@Composable
private fun SettingsSection(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(modifier = modifier.padding(vertical = 12.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        Column(Modifier.selectableGroup(), content = content)
    }
}

/** Opción de radio con control nativo `RadioButton`; la fila entera es el target táctil. */
@Composable
private fun SettingsOption(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = selected, onClick = onClick, role = Role.RadioButton)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = null)
        Spacer(Modifier.width(8.dp))
        Text(text = label, style = MaterialTheme.typography.bodyLarge)
    }
}
