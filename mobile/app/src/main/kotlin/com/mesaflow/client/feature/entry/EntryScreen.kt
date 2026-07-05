package com.mesaflow.client.feature.entry

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.mesaflow.client.R

/**
 * Pantalla de entrada: escanear el QR de la mesa (Google code scanner,
 * sin permiso de camara) o entrar en modo demo contra el backend.
 */
@Composable
fun EntryScreen(
    onEnter: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: EntryViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.navigateToMenu.collect { onEnter() }
    }

    val errorMessage = uiState.error?.let { error ->
        stringResource(
            when (error) {
                EntryError.QR_INVALID -> R.string.entry_error_qr_invalid
                EntryError.NETWORK -> R.string.entry_error_network
                EntryError.UNAUTHORIZED -> R.string.entry_error_unauthorized
                EntryError.GENERIC -> R.string.entry_error_generic
            },
        )
    }
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            snackbarHostState.showSnackbar(errorMessage)
            viewModel.onErrorShown()
        }
    }

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

            if (uiState.isLoading) {
                CircularProgressIndicator(Modifier.size(40.dp))
                Spacer(Modifier.height(12.dp))
                Text(
                    text = stringResource(R.string.entry_signing_in),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Button(
                    onClick = {
                        val options = GmsBarcodeScannerOptions.Builder()
                            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                            .enableAutoZoom()
                            .build()
                        GmsBarcodeScanning.getClient(context, options)
                            .startScan()
                            .addOnSuccessListener { barcode -> viewModel.onQrScanned(barcode.rawValue) }
                            .addOnFailureListener { viewModel.onQrScanned(null) }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.entry_scan_qr))
                }
                Spacer(Modifier.height(12.dp))
                TextButton(
                    onClick = viewModel::onDemoModeClick,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.entry_demo_mode))
                }
            }
        }
    }
}
