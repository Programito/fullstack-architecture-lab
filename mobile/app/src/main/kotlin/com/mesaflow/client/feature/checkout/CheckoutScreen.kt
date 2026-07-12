package com.mesaflow.client.feature.checkout

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.focusable
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mesaflow.client.R
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.designsystem.LocalWindowWidthSizeClass
import com.mesaflow.client.core.designsystem.components.ExitTableConfirmDialog
import com.mesaflow.client.core.designsystem.components.PriceText
import com.mesaflow.client.core.designsystem.expandedContentMaxWidth
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.PaymentResult
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

/**
 * Cobro del pedido: método de pago + botón de pagar (pasarela mock con
 * retardo simulado). Al aceptarse, pantalla de pago aceptado con el ticket
 * detallado (líneas de [linesJson], número de pedido, mesa, hora y método)
 * y dos salidas: seguir pidiendo o salir de la mesa.
 *
 * **Tablet (`Expanded`):** el formulario de cobro y el ticket de pago
 * aceptado se acotan a un ancho máximo cómodo y se centran, igual que
 * [com.mesaflow.client.feature.cart.CartScreen]; en `Compact`/`Medium` no
 * cambia nada. Ver docs/superpowers/plans/2026-07-12-tablet-adaptive-ui.md,
 * Fase 2.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    orderId: String,
    totalCents: Long,
    currency: String,
    linesJson: String,
    dailyNumber: Int,
    tableLabel: String,
    onBack: () -> Unit,
    onDone: () -> Unit,
    onExitTable: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CheckoutViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val windowWidthSizeClass = LocalWindowWidthSizeClass.current

    // "Salir de la mesa" desde la pantalla de éxito: el ViewModel hace logout y
    // emite exitTable; la navegación (este callback) vacía el stack hasta Entry.
    LaunchedEffect(Unit) {
        viewModel.exitTable.collect { onExitTable() }
    }

    // Sin esto, el botón/gesto atrás del sistema saldría de Checkout y dejaría ver de nuevo el
    // Carrito con su botón "Ir a cobrar" para un pedido que ya está pagado (el backend lo
    // rechazaría, pero solo tras un intento fallido confuso). Atrás en la pantalla de éxito debe
    // ser el mismo camino limpio que "Seguir pidiendo"; durante el cobro, se ignora para no
    // abandonar un pago a medias.
    BackHandler(enabled = uiState.isProcessing) {}
    BackHandler(enabled = uiState.result != null, onBack = onDone)

    val errorMessage = uiState.error?.let { stringResource(it.toMessageRes()) }
    val retryLabel = stringResource(R.string.action_retry)
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            // El pago no se registra hasta que el backend confirma: reintentar
            // es solo volver a llamar a onPay con el mismo importe/método.
            val result = snackbarHostState.showSnackbar(errorMessage, actionLabel = retryLabel)
            viewModel.onErrorShown()
            if (result == SnackbarResult.ActionPerformed) {
                viewModel.onPay(orderId, totalCents)
            }
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.TopCenter,
        ) {
            val contentModifier = Modifier.expandedContentMaxWidth(windowWidthSizeClass)
            val result = uiState.result
            if (result != null) {
                PaymentAcceptedContent(
                    result = result,
                    // Foto de las líneas enviada por navegación: el carrito real ya está vacío.
                    // Defensivo ante JSON corrupto: sin líneas el ticket se muestra igualmente.
                    lines = remember(linesJson) {
                        runCatching { Json.decodeFromString<List<CartLine>>(linesJson) }
                            .getOrDefault(emptyList())
                    },
                    method = uiState.method,
                    dailyNumber = dailyNumber,
                    tableLabel = tableLabel,
                    paidAtMillis = uiState.paidAtMillis,
                    onKeepOrdering = onDone,
                    onExitTableConfirmed = viewModel::onExitTableRequested,
                    modifier = contentModifier,
                )
            } else {
                CheckoutContent(
                    totalCents = totalCents,
                    currency = currency,
                    selectedMethod = uiState.method,
                    isProcessing = uiState.isProcessing,
                    onMethodSelected = viewModel::onMethodSelected,
                    onPay = { viewModel.onPay(orderId, totalCents) },
                    modifier = contentModifier,
                )
            }
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

/**
 * Pago aceptado: ticket detallado (número de pedido, mesa, hora, líneas,
 * importes reales del [PaymentResult] y método usado) más dos salidas:
 * "Seguir pidiendo" (vuelve a la carta) y "Salir de la mesa" (con
 * confirmación; oculto si queda saldo pendiente, porque la cuenta no está
 * cerrada). Los importes salen de [PaymentResult.paidCents] y
 * [PaymentResult.balanceCents], no del total de navegación: si el backend
 * registrara un pago parcial, la pantalla no mentiría.
 */
@Composable
private fun PaymentAcceptedContent(
    result: PaymentResult,
    lines: List<CartLine>,
    method: PaymentMethod,
    dailyNumber: Int,
    tableLabel: String,
    paidAtMillis: Long?,
    onKeepOrdering: () -> Unit,
    onExitTableConfirmed: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showExitConfirm by remember { mutableStateOf(false) }

    // Accesibilidad: con TalkBack, al llegar aquí el foco salta al título para
    // que el lector anuncie el éxito sin que el usuario tenga que explorar.
    val titleFocusRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) { titleFocusRequester.requestFocus() }

    // Hora local del pago, sellada por el ViewModel al confirmarse (no viene del backend).
    val paidTime = remember(paidAtMillis) {
        paidAtMillis?.let {
            DateTimeFormatter.ofPattern("HH:mm")
                .format(Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()))
        }
    }
    val fullyPaid = result.balanceCents <= 0L

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(72.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.checkout_accepted_title),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.primary,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .focusRequester(titleFocusRequester)
                .focusable()
                .semantics { heading() },
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = stringResource(R.string.checkout_accepted_message),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(16.dp))
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = stringResource(R.string.checkout_ticket_number, dailyNumber),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        text = if (paidTime != null) {
                            stringResource(R.string.checkout_ticket_table_time, tableLabel, paidTime)
                        } else {
                            stringResource(R.string.checkout_ticket_table, tableLabel)
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                if (lines.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider()
                    Spacer(Modifier.height(4.dp))
                    lines.forEach { line -> TicketLineRow(line) }
                    Spacer(Modifier.height(4.dp))
                }

                HorizontalDivider()
                Spacer(Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = stringResource(R.string.checkout_paid_label),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    PriceText(
                        amountCents = result.paidCents,
                        currencyCode = result.currency,
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = stringResource(R.string.checkout_paid_with, paymentMethodLabel(method)),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                if (!fullyPaid) {
                    Spacer(Modifier.height(8.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            text = stringResource(R.string.checkout_pending_label),
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.error,
                        )
                        PriceText(
                            amountCents = result.balanceCents,
                            currencyCode = result.currency,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = stringResource(R.string.checkout_pending_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        Spacer(Modifier.height(24.dp))
        Button(onClick = onKeepOrdering, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.checkout_keep_ordering))
        }
        // Con saldo pendiente no se ofrece cerrar la mesa: la cuenta no está saldada.
        if (fullyPaid) {
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { showExitConfirm = true },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.settings_exit_table_button))
            }
        }
    }

    if (showExitConfirm) {
        ExitTableConfirmDialog(
            onDismiss = { showExitConfirm = false },
            onConfirm = {
                showExitConfirm = false
                onExitTableConfirmed()
            },
        )
    }
}

/** Línea del ticket: cantidad, nombre, detalle de selecciones y precio final. */
@Composable
private fun TicketLineRow(line: CartLine) {
    Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "${line.quantity}× ${line.name}",
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.weight(1f),
            )
            PriceText(amountCents = line.totalCents, currencyCode = line.currency)
        }
        val details = buildList {
            line.selections.comboOptions.forEach { add(it.optionName) }
            line.selections.modifiers.forEach { add(it.optionName) }
            line.selections.removedComponents.forEach {
                add(stringResource(R.string.configurator_without, it.name))
            }
        }
        if (details.isNotEmpty()) {
            Text(
                text = details.joinToString(" · "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun paymentMethodLabel(method: PaymentMethod): String = stringResource(
    when (method) {
        PaymentMethod.CARD -> R.string.checkout_method_card
        PaymentMethod.BIZUM -> R.string.checkout_method_bizum
        PaymentMethod.CASH -> R.string.checkout_method_cash
    },
)

private fun AppError.toMessageRes(): Int = when (this) {
    AppError.Network -> R.string.entry_error_network
    AppError.Unauthorized -> R.string.entry_error_unauthorized
    AppError.Validation -> R.string.checkout_error_validation
    AppError.Server -> R.string.checkout_error_server
    else -> R.string.checkout_error_generic
}
