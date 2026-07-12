package com.mesaflow.client.feature.cart

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.mesaflow.client.core.designsystem.LocalWindowWidthSizeClass
import com.mesaflow.client.core.designsystem.components.EmptyState
import com.mesaflow.client.core.designsystem.components.PriceText
import com.mesaflow.client.core.designsystem.components.QuantityStepper
import com.mesaflow.client.core.designsystem.expandedContentMaxWidth
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.OrderLineKitchenStatus
import com.mesaflow.client.core.model.ServicePointOrderLine
import com.mesaflow.client.core.model.ServicePointOrderStatus
import com.mesaflow.client.core.model.SubmittedOrder

/**
 * Resumen del pedido: líneas editables (cantidad, borrar), total en vivo y
 * envío a cocina. Tras enviar con éxito muestra la confirmación; el cobro
 * llega en la Fase 7.
 *
 * **Tablet (`Expanded`):** el contenido se acota a un ancho máximo cómodo de
 * lectura y se centra en vez de estirarse a todo el ancho de la tablet; en
 * `Compact`/`Medium` no cambia nada respecto a antes. Ver
 * docs/superpowers/plans/2026-07-12-tablet-adaptive-ui.md, Fase 2.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(
    onBack: () -> Unit,
    /**
     * lines: foto de las líneas enviadas (el carrito real ya está vacío en este punto);
     * tableLabel: mesa del pedido. Ambos viajan a Cobro para el ticket detallado.
     */
    onCheckout: (submitted: SubmittedOrder, lines: List<CartLine>, tableLabel: String) -> Unit = { _, _, _ -> },
    modifier: Modifier = Modifier,
    viewModel: CartViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val lines by viewModel.lines.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val windowWidthSizeClass = LocalWindowWidthSizeClass.current

    val errorMessage = uiState.submitError?.let { stringResource(it.toMessageRes()) }
    val retryLabel = stringResource(R.string.action_retry)
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            // El error se limpia antes de esperar la acción: si el usuario
            // no reintenta, no debe volver a mostrarse el mismo Snackbar al
            // recomponer. El carrito sigue intacto en cualquier caso (ver
            // OrderRepository.submitCart): reintentar es solo repetir onSubmit.
            val result = snackbarHostState.showSnackbar(errorMessage, actionLabel = retryLabel)
            viewModel.onErrorShown()
            if (result == SnackbarResult.ActionPerformed) {
                viewModel.onSubmit()
            }
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.cart_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.cart_back),
                        )
                    }
                },
            )
        },
    ) { innerPadding ->
        // El ancho máximo/centrado se aplica aquí, envolviendo las tres variantes de contenido
        // (enviado, vacío, con líneas) por igual — en Compact/Medium el Box no restringe nada
        // (contentModifier === fillMaxWidth, igual que antes) y el Box en sí ya llena el hueco.
        val contentModifier = Modifier.expandedContentMaxWidth(windowWidthSizeClass)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.TopCenter,
        ) {
            val submitted = uiState.submitted
            when {
                submitted != null -> SubmittedContent(
                    totalCents = submitted.totalCents,
                    currency = submitted.currency,
                    orderStatus = uiState.orderStatus,
                    onBackToMenu = onBack,
                    onCheckout = { onCheckout(submitted, uiState.submittedLines, uiState.tableLabel) },
                    modifier = contentModifier,
                )

                lines.isEmpty() -> Column(contentModifier.padding(24.dp)) {
                    EmptyState(message = stringResource(R.string.cart_empty))
                }

                else -> CartContent(
                    lines = lines,
                    isSubmitting = uiState.isSubmitting,
                    onQuantityChange = viewModel::onQuantityChange,
                    onRemoveLine = viewModel::onRemoveLine,
                    onSubmit = viewModel::onSubmit,
                    modifier = contentModifier,
                )
            }
        }
    }
}

@Composable
private fun CartContent(
    lines: List<CartLine>,
    isSubmitting: Boolean,
    onQuantityChange: (Long, Int) -> Unit,
    onRemoveLine: (Long) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val totalCents = lines.sumOf { it.totalCents }
    val currency = lines.first().currency

    Column(modifier = modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f),
        ) {
            item { Spacer(Modifier.height(4.dp)) }
            items(lines, key = { it.id }) { line ->
                CartLineCard(
                    line = line,
                    onQuantityChange = { onQuantityChange(line.id, it) },
                    onRemove = { onRemoveLine(line.id) },
                )
            }
            item { Spacer(Modifier.height(8.dp)) }
        }

        HorizontalDivider()
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        ) {
            Text(
                text = stringResource(R.string.cart_total),
                style = MaterialTheme.typography.titleLarge,
            )
            PriceText(
                amountCents = totalCents,
                currencyCode = currency,
                style = MaterialTheme.typography.titleLarge,
            )
        }
        Button(
            onClick = onSubmit,
            enabled = !isSubmitting,
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(
                    modifier = Modifier.height(20.dp).width(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text(stringResource(R.string.cart_submit))
            }
        }
    }
}

@Composable
private fun CartLineCard(
    line: CartLine,
    onQuantityChange: (Int) -> Unit,
    onRemove: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = line.name,
                    style = MaterialTheme.typography.titleMedium,
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
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            ) {
                QuantityStepper(quantity = line.quantity, onQuantityChange = onQuantityChange)
                IconButton(onClick = onRemove) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = stringResource(R.string.cart_remove_line),
                        tint = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}

@Composable
private fun SubmittedContent(
    totalCents: Long,
    currency: String,
    orderStatus: ServicePointOrderStatus?,
    onBackToMenu: () -> Unit,
    onCheckout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = modifier.fillMaxSize().padding(32.dp),
    ) {
        Text(
            text = stringResource(R.string.cart_submitted_title),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.primary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.cart_submitted_message),
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(16.dp))
        PriceText(
            amountCents = totalCents,
            currencyCode = currency,
            style = MaterialTheme.typography.headlineMedium,
        )
        // El pedido puede tardar en aparecer en el primer sondeo (justo se
        // acaba de enviar); sin lineas todavia no hay nada util que mostrar.
        if (orderStatus != null && orderStatus.lines.isNotEmpty()) {
            Spacer(Modifier.height(24.dp))
            OrderProgressCard(lines = orderStatus.lines)
        }
        Spacer(Modifier.height(32.dp))
        Button(onClick = onCheckout, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.cart_go_to_checkout))
        }
        Spacer(Modifier.height(8.dp))
        TextButton(onClick = onBackToMenu) {
            Text(stringResource(R.string.cart_back_to_menu))
        }
    }
}

/**
 * Progreso en cocina del pedido recien enviado; se alimenta del sondeo de
 * [com.mesaflow.client.feature.cart.CartViewModel.startOrderStatusPolling]
 * (mismo dato que ve el panel de sala/cocina para esta mesa). No hay
 * confirmacion de entrega real hasta que el camarero sirve la mesa: esto es
 * un adelanto informativo, no una promesa de tiempos.
 */
@Composable
private fun OrderProgressCard(lines: List<ServicePointOrderLine>) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp).fillMaxWidth()) {
            Text(
                text = stringResource(R.string.cart_kitchen_progress_title),
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(8.dp))
            lines.forEach { line ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                ) {
                    Text(
                        text = "${line.quantity}× ${line.productName}",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = orderLineStatusLabel(line.status),
                        style = MaterialTheme.typography.labelMedium,
                        color = if (line.status == OrderLineKitchenStatus.READY ||
                            line.status == OrderLineKitchenStatus.SERVED
                        ) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun orderLineStatusLabel(status: OrderLineKitchenStatus): String = stringResource(
    when (status) {
        OrderLineKitchenStatus.PENDING -> R.string.order_line_status_pending
        OrderLineKitchenStatus.SENT_TO_KITCHEN -> R.string.order_line_status_sent_to_kitchen
        OrderLineKitchenStatus.PREPARING -> R.string.order_line_status_preparing
        OrderLineKitchenStatus.READY -> R.string.order_line_status_ready
        OrderLineKitchenStatus.PICKED_UP -> R.string.order_line_status_picked_up
        OrderLineKitchenStatus.SERVED -> R.string.order_line_status_served
        OrderLineKitchenStatus.CANCELLED -> R.string.order_line_status_cancelled
        OrderLineKitchenStatus.UNKNOWN -> R.string.order_line_status_unknown
    },
)

private fun AppError.toMessageRes(): Int = when (this) {
    AppError.Network -> R.string.entry_error_network
    AppError.Unauthorized -> R.string.entry_error_unauthorized
    AppError.Server -> R.string.cart_error_server
    else -> R.string.cart_error_submit
}
