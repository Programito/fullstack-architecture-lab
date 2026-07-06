package com.mesaflow.client.feature.checkout

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mesaflow.client.R
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.designsystem.components.PriceText
import com.mesaflow.client.core.model.PaymentMethod

/**
 * Cobro del pedido: método de pago + botón de pagar (pasarela mock con
 * retardo simulado). Al aceptarse, pantalla de pago aceptado con el total
 * y vuelta a la carta.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    orderId: String,
    totalCents: Long,
    currency: String,
    onBack: () -> Unit,
    onDone: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CheckoutViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    val errorMessage = uiState.error?.let { stringResource(it.toMessageRes()) }
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            snackbarHostState.showSnackbar(errorMessage)
            viewModel.onErrorShown()
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            if (uiState.result == null) {
                TopAppBar(
                    title = { Text(stringResource(R.string.checkout_title)) },
                    navigationIcon = {
                        IconButton(onClick = onBack, enabled = !uiState.isProcessing) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = stringResource(R.string.cart_back),
                            )
                        }
                    },
                )
            }
        },
    ) { innerPadding ->
        if (uiState.result != null) {
            PaymentAcceptedContent(
                totalCents = totalCents,
                currency = currency,
                onDone = onDone,
                modifier = Modifier.padding(innerPadding),
            )
        } else {
            CheckoutContent(
                totalCents = totalCents,
                currency = currency,
                selectedMethod = uiState.method,
                isProcessing = uiState.isProcessing,
                onMethodSelected = viewModel::onMethodSelected,
                onPay = { viewModel.onPay(orderId, totalCents) },
                modifier = Modifier.padding(innerPadding),
            )
        }
    }
}

@Composable
private fun CheckoutContent(
    totalCents: Long,
    currency: String,
    selectedMethod: PaymentMethod,
    isProcessing: Boolean,
    onMethodSelected: (PaymentMethod) -> Unit,
    onPay: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize().padding(24.dp)) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth().padding(24.dp),
            ) {
                Text(
                    text = stringResource(R.string.checkout_amount_label),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(4.dp))
                PriceText(
                    amountCents = totalCents,
                    currencyCode = currency,
                    style = MaterialTheme.typography.displaySmall,
                )
            }
        }

        Spacer(Modifier.height(24.dp))
        Text(
            text = stringResource(R.string.checkout_method_title),
            style = MaterialTheme.typography.titleMedium,
        )
        Spacer(Modifier.height(8.dp))
        PaymentMethodRow(
            label = stringResource(R.string.checkout_method_card),
            selected = selectedMethod == PaymentMethod.CARD,
            enabled = !isProcessing,
            onClick = { onMethodSelected(PaymentMethod.CARD) },
        )
        PaymentMethodRow(
            label = stringResource(R.string.checkout_method_bizum),
            selected = selectedMethod == PaymentMethod.BIZUM,
            enabled = !isProcessing,
            onClick = { onMethodSelected(PaymentMethod.BIZUM) },
        )
        PaymentMethodRow(
            label = stringResource(R.string.checkout_method_cash),
            selected = selectedMethod == PaymentMethod.CASH,
            enabled = !isProcessing,
            onClick = { onMethodSelected(PaymentMethod.CASH) },
        )

        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.checkout_mock_note),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.weight(1f))
        Button(
            onClick = onPay,
            enabled = !isProcessing,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (isProcessing) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Spacer(Modifier.width(12.dp))
                Text(stringResource(R.string.checkout_processing))
            } else {
                Text(stringResource(R.string.checkout_pay))
            }
        }
    }
}

@Composable
private fun PaymentMethodRow(
    label: String,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        RadioButton(selected = selected, onClick = onClick, enabled = enabled)
        Spacer(Modifier.width(8.dp))
        Text(text = label, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun PaymentAcceptedContent(
    totalCents: Long,
    currency: String,
    onDone: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = modifier.fillMaxSize().padding(32.dp),
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(96.dp),
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.checkout_accepted_title),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.primary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.checkout_accepted_message),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(16.dp))
        PriceText(
            amountCents = totalCents,
            currencyCode = currency,
            style = MaterialTheme.typography.headlineMedium,
        )
        Spacer(Modifier.height(32.dp))
        Button(onClick = onDone) {
            Text(stringResource(R.string.checkout_done))
        }
    }
}

private fun AppError.toMessageRes(): Int = when (this) {
    AppError.Network -> R.string.entry_error_network
    AppError.Unauthorized -> R.string.entry_error_unauthorized
    AppError.Validation -> R.string.checkout_error_validation
    else -> R.string.checkout_error_generic
}
