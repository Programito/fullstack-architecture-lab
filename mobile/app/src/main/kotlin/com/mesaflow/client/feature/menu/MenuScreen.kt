package com.mesaflow.client.feature.menu

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import com.mesaflow.client.R
import com.mesaflow.client.core.common.PriceFormatter
import com.mesaflow.client.core.designsystem.components.CategoryChip
import com.mesaflow.client.core.designsystem.components.EmptyState
import com.mesaflow.client.core.designsystem.components.ErrorState
import com.mesaflow.client.core.designsystem.components.PriceText
import com.mesaflow.client.core.designsystem.components.SkeletonBox
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.MenuSection
import com.mesaflow.client.feature.product.ProductConfiguratorSheet

/**
 * Carta del restaurante: buscador por texto (sin tildes), chips de categoria
 * y lista de productos con imagen y precio. Los items agotados se muestran
 * deshabilitados. El tap en producto abre el configurador; la barra flotante
 * inferior resume el carrito (la pantalla de resumen llega en la Fase 6).
 */
@Composable
fun MenuScreen(
    modifier: Modifier = Modifier,
    onCartClick: () -> Unit = {},
    viewModel: MenuViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val cartSummary by viewModel.cartSummary.collectAsStateWithLifecycle()

    Scaffold(
        modifier = modifier.fillMaxSize(),
        floatingActionButton = {
            AnimatedVisibility(
                visible = !cartSummary.isEmpty,
                enter = fadeIn() + scaleIn(),
                exit = fadeOut() + scaleOut(),
            ) {
                CartFab(summary = cartSummary, onClick = onCartClick)
            }
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
        ) {
            MenuHeader(
                menuName = (uiState.content as? MenuContentState.Ready)?.menu?.name.orEmpty(),
                tableLabel = uiState.tableLabel,
            )

            when (val content = uiState.content) {
                is MenuContentState.Loading -> MenuSkeleton()

                is MenuContentState.Error -> ErrorState(
                    message = stringResource(R.string.menu_error_load),
                    onRetry = { viewModel.load(forceRefresh = true) },
                )

                is MenuContentState.Ready -> {
                    OutlinedTextField(
                        value = uiState.query,
                        onValueChange = viewModel::onQueryChange,
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text(stringResource(R.string.menu_search_hint)) },
                        singleLine = true,
                        shape = MaterialTheme.shapes.large,
                    )
                    Spacer(Modifier.height(12.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item {
                            CategoryChip(
                                label = stringResource(R.string.menu_all_categories),
                                selected = uiState.selectedSectionId == null,
                                onClick = { viewModel.onSectionSelected(null) },
                            )
                        }
                        items(content.menu.sections, key = { it.id }) { section ->
                            CategoryChip(
                                label = section.name,
                                selected = uiState.selectedSectionId == section.id,
                                onClick = { viewModel.onSectionSelected(section.id) },
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))

                    val sections = uiState.filteredSections
                    if (sections.isEmpty()) {
                        EmptyState(message = stringResource(R.string.menu_empty_results))
                    } else {
                        MenuList(sections = sections, onItemClick = viewModel::onItemClick)
                    }
                }
            }
        }

        uiState.configuringItem?.let { item ->
            ProductConfiguratorSheet(
                item = item,
                onDismiss = viewModel::onConfiguratorDismiss,
                onAddToCart = viewModel::onAddToCart,
            )
        }
    }
}

@Composable
private fun CartFab(summary: CartSummary, onClick: () -> Unit) {
    // Pequeño "rebote" cada vez que cambia el nº de artículos, para que
    // añadir algo al carrito se note en la barra sin ser intrusivo.
    val bounceScale = remember { Animatable(1f) }
    LaunchedEffect(summary.itemCount) {
        bounceScale.snapTo(0.85f)
        bounceScale.animateTo(1f, animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy))
    }
    ExtendedFloatingActionButton(
        onClick = onClick,
        containerColor = MaterialTheme.colorScheme.primary,
        contentColor = MaterialTheme.colorScheme.onPrimary,
        modifier = Modifier.scale(bounceScale.value),
    ) {
        Text(
            text = stringResource(
                R.string.cart_fab_label,
                summary.itemCount,
                PriceFormatter.format(summary.totalCents, summary.currency),
            ),
            style = MaterialTheme.typography.titleMedium,
        )
    }
}

@Composable
private fun MenuHeader(menuName: String, tableLabel: String) {
    Column(Modifier.padding(vertical = 16.dp)) {
        Text(
            text = menuName.ifBlank { stringResource(R.string.menu_title) },
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        if (tableLabel.isNotBlank()) {
            Text(
                text = stringResource(R.string.menu_table_label, tableLabel),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun MenuList(
    sections: List<MenuSection>,
    onItemClick: (MenuItem) -> Unit,
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        sections.forEach { section ->
            item(key = "header-${section.id}") {
                Text(
                    text = section.name,
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(top = 12.dp, bottom = 4.dp),
                )
            }
            items(section.items, key = { it.id }) { item ->
                MenuItemCard(item = item, onClick = { onItemClick(item) })
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun MenuItemCard(item: MenuItem, onClick: () -> Unit) {
    val openLabel = stringResource(R.string.menu_item_open)
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .clickable(
                enabled = item.isAvailable,
                onClickLabel = openLabel,
                role = Role.Button,
                onClick = onClick,
            )
            .alpha(if (item.isAvailable) 1f else 0.5f),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (item.imageUrl != null) {
                AsyncImage(
                    model = item.imageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(72.dp)
                        .clip(MaterialTheme.shapes.small),
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(MaterialTheme.shapes.small)
                        .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!item.description.isNullOrBlank()) {
                    Text(
                        text = item.description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(4.dp))
                if (item.isAvailable) {
                    PriceText(amountCents = item.priceCents, currencyCode = item.currency)
                } else {
                    Text(
                        text = stringResource(R.string.menu_unavailable),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}

@Composable
private fun MenuSkeleton() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SkeletonBox(Modifier.fillMaxWidth().height(56.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            repeat(3) { SkeletonBox(Modifier.width(88.dp).height(32.dp)) }
        }
        repeat(5) { SkeletonBox(Modifier.fillMaxWidth().height(96.dp)) }
    }
}
