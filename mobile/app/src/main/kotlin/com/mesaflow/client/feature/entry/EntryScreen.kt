package com.mesaflow.client.feature.entry

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.mesaflow.client.R
import com.mesaflow.client.core.designsystem.MesaFlowTheme
import kotlinx.coroutines.launch

/**
 * Pantalla de entrada (Fase 0: esqueleto visual).
 *
 * Fase 3: el botón de escanear abrirá CameraX + ML Kit y el modo demo
 * hará login contra POST /api/v1/auth/demo-login.
 */
@Composable
fun EntryScreen(modifier: Modifier = Modifier) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val comingSoon = stringResource(R.string.entry_coming_soon)

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.displayMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.entry_tagline),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(48.dp))
            Button(
                onClick = { scope.launch { snackbarHostState.showSnackbar(comingSoon) } },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.entry_scan_qr))
            }
            Spacer(Modifier.height(12.dp))
            TextButton(
                onClick = { scope.launch { snackbarHostState.showSnackbar(comingSoon) } },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.entry_demo_mode))
            }
        }
    }
}

@Preview(showBackground = true, locale = "es")
@Composable
private fun EntryScreenPreview() {
    MesaFlowTheme {
        EntryScreen()
    }
}
