package com.mesaflow.client.feature.entry

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.mesaflow.client.core.model.PlatformStatus

/**
 * Pantalla de entrada: escanear el QR de la mesa (Google code scanner,
 * sin permiso de camara), introducir el codigo a mano (alternativa
 * accesible: escanear un QR exige camara y vision, asi que quien no puede
 * usarla necesita una forma equivalente de identificar su mesa - ver
 * [ManualEntryDialog]) o entrar en modo demo contra el backend.
 */
@Composable
fun EntryScreen(
    onEnter: () -> Unit,
    onSettingsClick: () -> Unit,
    onReservationClick: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: EntryViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current
    var showManualEntry by remember { mutableStateOf(false) }

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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 32.dp),
        ) {
            IconButton(
                onClick = onSettingsClick,
                modifier = Modifier.align(Alignment.TopEnd),
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = stringResource(R.string.settings_open),
                )
            }

            Column(
                modifier = Modifier.align(Alignment.Center),
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

                val readinessStatus = uiState.readinessStatus
                when (readinessStatus) {
                    PlatformStatus.WARMING_UP, PlatformStatus.DOWN -> {
                        Spacer(Modifier.height(24.dp))
                        PlatformReadinessBanner(status = readinessStatus)
                    }
                    else -> Unit
                }
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
                    // Alternativa accesible al escaner: escanear un QR requiere
                    // camara y vision, asi que una persona ciega o con baja
                    // vision (o con una camara rota, o un QR danado/con mala
                    // luz) no puede usar el boton de arriba en absoluto. El modo
                    // demo de mas abajo no sirve como sustituto porque siempre
                    // entra a la mesa fija de demo, no a la mesa real del
                    // cliente - de ahi que el codigo manual sea su propio boton
                    // y reutilice el mismo QrPayloadParser/onQrScanned que el
                    // escaner, para no duplicar la validacion.
                    TextButton(
                        onClick = { showManualEntry = true },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(R.string.entry_manual_entry_open))
                    }
                    Spacer(Modifier.height(12.dp))
                    TextButton(
                        onClick = viewModel::onDemoModeClick,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(R.string.entry_demo_mode))
                    }
                    Spacer(Modifier.height(12.dp))
                    // Reservar no exige haber escaneado ninguna mesa: se puede
                    // reservar antes de llegar al restaurante. Usa su propio
                    // login (rol customer) igual que el resto de esta pantalla,
                    // ver ReservationViewModel.ensureRestaurantId.
                    TextButton(
                        onClick = onReservationClick,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(R.string.entry_reservation_open))
                    }
                }
            }
        }

        if (showManualEntry) {
            ManualEntryDialog(
                onDismiss = { showManualEntry = false },
                onConfirm = { code ->
                    showManualEntry = false
                    viewModel.onQrScanned(code)
                },
            )
        }
    }
}

/**
 * Aviso de que el backend (base de datos de hosting gratuito) sigue
 * despertando o no responde, ver [EntryViewModel.watchReadiness]. No bloquea
 * el escaner ni el modo demo: el cliente puede seguir intentando entrar
 * mientras tanto, igual que en el login web (`PlatformReadinessService`).
 */
@Composable
private fun PlatformReadinessBanner(status: PlatformStatus, modifier: Modifier = Modifier) {
    val isDown = status == PlatformStatus.DOWN
    val containerColor = if (isDown) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.tertiaryContainer
    val contentColor = if (isDown) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onTertiaryContainer
    Card(
        colors = CardDefaults.cardColors(containerColor = containerColor),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Icon(
                imageVector = Icons.Default.WarningAmber,
                contentDescription = null,
                tint = contentColor,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(12.dp))
            Column {
                Text(
                    text = stringResource(
                        if (isDown) R.string.entry_readiness_down_title else R.string.entry_readiness_warming_up_title,
                    ),
                    style = MaterialTheme.typography.titleSmall,
                    color = contentColor,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = stringResource(
                        if (isDown) R.string.entry_readiness_down_description else R.string.entry_readiness_warming_up_description,
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                    color = contentColor,
                )
            }
        }
    }
}

/**
 * Dialogo de codigo manual: mismo destino que el escaner
 * ([EntryViewModel.onQrScanned]), asi que valida y muestra error igual que
 * un QR mal formado - no hay una segunda ruta de validacion que mantener.
 */
@Composable
private fun ManualEntryDialog(onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var code by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.entry_manual_entry_title)) },
        text = {
            Column {
                Text(
                    text = stringResource(R.string.entry_manual_entry_hint),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it },
                    label = { Text(stringResource(R.string.entry_manual_entry_label)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(code) }, enabled = code.isNotBlank()) {
                Text(stringResource(R.string.entry_manual_entry_confirm))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.entry_manual_entry_cancel))
            }
        },
    )
}
