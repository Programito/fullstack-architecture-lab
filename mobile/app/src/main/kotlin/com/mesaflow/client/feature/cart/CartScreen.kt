package com.mesaflow.client.feature.cart

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Settings
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import com.mesaflow.client.R
import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.PriceFormatter
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
 * Order summary: editable lines (quantity, remove), live total and kitchen
 * submit. After a successful submit it shows the confirmation state; payment
 * happens later in phase 7.
 *
 * Tablet (`Expanded`): content is constrained to a comfortable max width and
 * centered instead of stretching edge to edge. `Compact`/`Medium` keep the
 * previous behavior. See docs/superpowers/plans/2026-07-12-tablet-adaptive-ui.md.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(
    onBack: () -> Unit,
    onSettingsClick: () -> Unit = {},
    /**
     * `lines`: snapshot of the submitted lines (the live cart is already empty
     * at this point). `tableLabel`: table name for the ticket shown during
     * checkout.
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
            // Clear the error before waiting for user action so recomposition
            // does not show the same Snackbar again if they do nothing.
            val result = snackbarHostState.showSnackbar(errorMessage, actionLabel = retryLabel)
            viewModel.onErrorShown()
            if (result == SnackbarResult.ActionPerformed) {
                viewModel.onSubmit()
            }
        }
    }

    LaunchedEffect(uiState.submitted) {
        val submitted = uiState.submitted ?: return@LaunchedEffect
        onCheckout(submitted, uiState.submittedLines, uiState.tableLabel)
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
                actions = {
                    IconButton(onClick = onSettingsClick) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = stringResource(R.string.settings_open),
                        )
                    }
                    if (lines.isNotEmpty() && uiState.submitted == null) {
                        IconButton(onClick = viewModel::onClearCart) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = stringResource(R.string.cart_clear),
                            )
                        }
                    }
                },
            )
        },
    ) { innerPadding ->
        val contentModifier = Modifier.expandedContentMaxWidth(windowWidthSizeClass)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.TopCenter,
        ) {
            val submitted = uiState.submitted
            when {
                submitted != null && lines.isEmpty() -> Box(
                    modifier = contentModifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }

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
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(
                    modifier = Modifier.height(20.dp).width(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Spacer(Modifier.width(12.dp))
                Text(stringResource(R.string.cart_submit))
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
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CartLineThumbnail(imageUrl = line.imageUrl)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.Top) {
                    Text(
                        text = line.name,
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.width(12.dp))
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
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
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
}

@Composable
private fun CartLineThumbnail(imageUrl: String?) {
    val thumbnailModifier = Modifier
        .size(72.dp)
        .clip(RoundedCornerShape(12.dp))

    if (imageUrl != null) {
        AsyncImage(
            model = imageUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = thumbnailModifier,
        )
    } else {
        Box(
            modifier = thumbnailModifier.background(MaterialTheme.colorScheme.surfaceContainerHighest),
        )
    }
}

private fun AppError.toMessageRes(): Int = when (this) {
    AppError.Network -> R.string.entry_error_network
    AppError.Unauthorized -> R.string.entry_error_unauthorized
    AppError.Server -> R.string.cart_error_server
    else -> R.string.cart_error_submit
}
