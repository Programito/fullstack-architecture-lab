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
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.FilterAlt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.mesaflow.client.core.model.Allergen
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.MenuSection
import com.mesaflow.client.feature.product.ProductConfiguratorSheet

/**
 * Carta del restaurante: buscador por texto (sin tildes), chips de categoria
 * y lista de productos con imagen y precio. Los items agotados se muestran
 * deshabilitados. El tap en producto abre el configurador; la barra flotante
 * inferior resume el carrito (la pantalla de resumen llega en la Fase 6).
 * El icono de ajustes de la cabecera lleva a tema/idioma (locales al dispositivo).
 * Si el último envío del carrito falló y no se ha reintentado, se avisa con
 * un banner aunque el cliente haya vuelto sin resolverlo desde el Carrito.
 * El filtro de alérgenos se basa en lo que declara el propio restaurante
 * (backend `Product.allergens`); ver KDoc de [MenuFilter].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuScreen(
    modifier: Modifier = Modifier,
    onCartClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {},
    viewModel: MenuViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val cartSummary by viewModel.cartSummary.collectAsStateWithLifecycle()
    val hasPendingSubmissionIssue by viewModel.hasPendingSubmissionIssue.collectAsStateWithLifecycle()
    var showAllergenFilter by remember { mutableStateOf(false) }

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
                onSettingsClick = onSettingsClick,
            )

            // Solo tiene sentido si de verdad hay algo pendiente en el carrito:
            // si el usuario vació las líneas a mano, el aviso ya no aplica
            // aunque el flag interno siga marcado hasta el próximo envío.
            if (hasPendingSubmissionIssue && !cartSummary.isEmpty) {
                PendingSubmissionBanner(onClick = onCartClick)
                Spacer(Modifier.height(8.dp))
            }

            when (val content = uiState.content) {
                is MenuContentState.Loading -> MenuSkeleton()

                is MenuContentState.Error -> ErrorState(
                    message = stringResource(R.string.menu_error_load),
                    onRetry = { viewModel.load(forceRefresh = true) },
                )

                is MenuContentState.Ready -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = uiState.query,
                            onValueChange = viewModel::onQueryChange,
                            modifier = Modifier.weight(1f),
                            placeholder = { Text(stringResource(R.string.menu_search_hint)) },
                            singleLine = true,
                            shape = MaterialTheme.shapes.large,
                        )
                        IconButton(onClick = { showAllergenFilter = true }) {
                            Icon(
                                imageVector = Icons.Default.FilterAlt,
                                contentDescription = stringResource(R.string.menu_allergen_filter_open),
                                tint = if (uiState.excludedAllergens.isEmpty()) {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                } else {
                                    MaterialTheme.colorScheme.primary
                                },
                            )
                        }
                    }
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

        if (showAllergenFilter) {
            AllergenFilterSheet(
                excluded = uiState.excludedAllergens,
                onToggle = viewModel::onAllergenToggled,
                onDismiss = { showAllergenFilter = false },
            )
        }
    }
}

/**
 * Selector de alérgenos a evitar; oculta de la carta cualquier producto que
 * los declare (ver [MenuFilter]). No sustituye la confirmación con el
 * personal ante una alergia grave: depende de que el restaurante haya
 * declarado bien sus productos.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AllergenFilterSheet(
    excluded: Set<Allergen>,
    onToggle: (Allergen) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            Text(
                text = stringResource(R.string.menu_allergen_filter_title),
                style = MaterialTheme.typography.titleLarge,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.menu_allergen_filter_hint),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            Column(Modifier.selectableGroup()) {
                SELECTABLE_ALLERGENS.forEach { allergen ->
                    AllergenOption(
                        label = allergenLabel(allergen),
                        checked = allergen in excluded,
                        onClick = { onToggle(allergen) },
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

/** Todos los alérgenos salvo UNKNOWN: no tiene sentido ofrecer "evitar un alérgeno sin nombre". */
private val SELECTABLE_ALLERGENS = Allergen.entries.filter { it != Allergen.UNKNOWN }

/** Opción de checkbox; la fila entera es el target táctil (mismo patrón que Ajustes). */
@Composable
private fun AllergenOption(label: String, checked: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = checked, onClick = onClick, role = Role.Checkbox)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked = checked, onCheckedChange = null)
        Spacer(Modifier.width(8.dp))
        Text(text = label, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun allergenLabel(allergen: Allergen): String = stringResource(
    when (allergen) {
        Allergen.GLUTEN -> R.string.allergen_gluten
        Allergen.CRUSTACEANS -> R.string.allergen_crustaceans
        Allergen.EGGS -> R.string.allergen_eggs
        Allergen.FISH -> R.string.allergen_fish
        Allergen.PEANUTS -> R.string.allergen_peanuts
        Allergen.SOYBEANS -> R.string.allergen_soybeans
        Allergen.MILK -> R.string.allergen_milk
        Allergen.NUTS -> R.string.allergen_nuts
        Allergen.CELERY -> R.string.allergen_celery
        Allergen.MUSTARD -> R.string.allergen_mustard
        Allergen.SESAME -> R.string.allergen_sesame
        Allergen.SULPHITES -> R.string.allergen_sulphites
        Allergen.LUPIN -> R.string.allergen_lupin
        Allergen.MOLLUSCS -> R.string.allergen_molluscs
        Allergen.UNKNOWN -> R.string.allergen_unknown
    },
)

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
private fun MenuHeader(menuName: String, tableLabel: String, onSettingsClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(Modifier.weight(1f)) {
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
        IconButton(onClick = onSettingsClick) {
            Icon(
                imageVector = Icons.Default.Settings,
                contentDescription = stringResource(R.string.settings_open),
            )
        }
    }
}

/** Aviso de que el último envío del pedido falló; toca para volver al Carrito y reintentar. */
@Composable
private fun PendingSubmissionBanner(onClick: () -> Unit) {
    val label = stringResource(R.string.menu_pending_submission)
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = label, role = Role.Button, onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Default.ErrorOutline,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onErrorContainer,
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onErrorContainer,
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
                if (item.allergens.isNotEmpty()) {
                    Spacer(Modifier.height(2.dp))
                    AllergenBadge(allergens = item.allergens)
                }
            }
        }
    }
}

/** "Contiene: gluten, leche"; los alérgenos son los que declara el propio restaurante. */
@Composable
private fun AllergenBadge(allergens: List<Allergen>) {
    val labels = allergens.map { allergenLabel(it) }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = Icons.Default.WarningAmber,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(14.dp),
        )
        Spacer(Modifier.width(4.dp))
        Text(
            text = stringResource(R.string.menu_contains_allergens, labels.joinToString(", ")),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
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
