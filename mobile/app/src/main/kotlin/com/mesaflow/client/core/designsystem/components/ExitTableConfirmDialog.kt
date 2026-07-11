package com.mesaflow.client.core.designsystem.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.mesaflow.client.R

/**
 * Confirmación antes de cerrar la sesión de mesa: es una acción con efecto real (hay que
 * volver a escanear el QR o entrar en modo demo), así que no debe dispararse con un solo tap
 * accidental. Compartido entre Ajustes y la pantalla de pago aceptado (Cobro); por eso vive
 * en designsystem y reutiliza las mismas cadenas `settings_exit_table_*` en ambos sitios.
 */
@Composable
fun ExitTableConfirmDialog(onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.settings_exit_table_confirm_title)) },
        text = { Text(stringResource(R.string.settings_exit_table_confirm_message)) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(stringResource(R.string.settings_exit_table_confirm_button))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.settings_exit_table_cancel_button))
            }
        },
    )
}
