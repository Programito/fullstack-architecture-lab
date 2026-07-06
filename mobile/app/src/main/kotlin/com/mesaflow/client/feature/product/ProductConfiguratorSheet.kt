package com.mesaflow.client.feature.product

import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.mesaflow.client.R
import com.mesaflow.client.core.common.PriceFormatter
import com.mesaflow.client.core.designsystem.components.QuantityStepper
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.ComboSlot
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.ModifierGroup
import com.mesaflow.client.core.model.PlatterComponent

/**
 * Configurador de producto: bottom sheet con grupos de extras (única/múltiple),
 * slots de combo con suplemento e ingredientes quitables ("sin cebolla").
 * El botón de añadir muestra el total dinámico y se deshabilita hasta que la
 * configuración cumple los mínimos requeridos.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductConfiguratorSheet(
    item: MenuItem,
    onDismiss: () -> Unit,
    onAddToCart: (CartLine) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var config by remember(item.id) { mutableStateOf(ProductConfig(item)) }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp)
                .padding(bottom = 24.dp),
        ) {
            Text(item.name, style = MaterialTheme.typography.headlineSmall)
            if (!item.description.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = item.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            item.comboDefinition?.slots.orEmpty().forEach { slot ->
                ComboSlotSection(
                    slot = slot,
                    currency = item.currency,
                    selected = config.optionsBySlot[slot.id].orEmpty(),
                    onToggle = { config = config.toggleComboOption(slot, it) },
                )
            }

            item.modifierGroups.forEach { group ->
                ModifierGroupSection(
                    group = group,
                    currency = item.currency,
                    selected = config.optionsByGroup[group.id].orEmpty(),
                    onToggle = { config = config.toggleModifier(group, it) },
                )
            }

            val removable = item.platterComponents.filter { it.removable }
            if (removable.isNotEmpty()) {
                RemovableComponentsSection(
                    components = removable,
                    removedIds = config.removedComponentIds,
                    onToggle = { config = config.toggleRemovedComponent(it) },
                )
            }

            Spacer(Modifier.height(24.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                QuantityStepper(
                    quantity = config.quantity,
                    onQuantityChange = { config = config.withQuantity(it) },
                    max = ProductConfig.MAX_QUANTITY,
                )
                Button(
                    onClick = { onAddToCart(config.toCartLine()) },
                    enabled = config.isValid,
                ) {
                    Text(
                        stringResource(
                            R.string.configurator_add_for,
                            PriceFormatter.format(config.totalCents, item.currency),
                        ),
                    )
                }
            }
            if (!config.isValid) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = stringResource(R.string.configurator_required_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, required: Boolean) {
    Spacer(Modifier.height(20.dp))
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        if (required) {
            Text(
                text = stringResource(R.string.configurator_required),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
    HorizontalDivider(Modifier.padding(vertical = 8.dp))
}

@Composable
private fun ModifierGroupSection(
    group: ModifierGroup,
    currency: String,
    selected: Set<String>,
    onToggle: (String) -> Unit,
) {
    SectionHeader(title = group.name, required = group.isRequired)
    group.options.forEach { option ->
        OptionRow(
            label = option.name,
            priceLabel = option.priceDeltaCents
                .takeIf { it != 0L }
                ?.let { PriceFormatter.formatDelta(it, currency) },
            checked = option.id in selected,
            single = group.singleSelection,
            enabled = option.isAvailable,
            onClick = { onToggle(option.id) },
        )
    }
}

@Composable
private fun ComboSlotSection(
    slot: ComboSlot,
    currency: String,
    selected: Set<String>,
    onToggle: (String) -> Unit,
) {
    SectionHeader(title = slot.name, required = slot.isRequired)
    slot.options.forEach { option ->
        OptionRow(
            label = option.name,
            priceLabel = option.supplementPriceCents
                .takeIf { it != 0L }
                ?.let { PriceFormatter.formatDelta(it, currency) },
            checked = option.id in selected,
            single = slot.maxSelections <= 1,
            enabled = option.isAvailable,
            onClick = { onToggle(option.id) },
        )
    }
}

@Composable
private fun RemovableComponentsSection(
    components: List<PlatterComponent>,
    removedIds: Set<String>,
    onToggle: (String) -> Unit,
) {
    SectionHeader(title = stringResource(R.string.configurator_remove_title), required = false)
    components.forEach { component ->
        val removed = component.id in removedIds
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .toggleable(
                    value = removed,
                    onValueChange = { onToggle(component.id) },
                    role = Role.Checkbox,
                )
                .padding(vertical = 4.dp),
        ) {
            Checkbox(checked = removed, onCheckedChange = null)
            Spacer(Modifier.width(8.dp))
            Text(
                text = if (removed) {
                    stringResource(R.string.configurator_without, component.name)
                } else {
                    component.name
                },
                style = MaterialTheme.typography.bodyLarge,
                textDecoration = if (removed) TextDecoration.LineThrough else null,
            )
        }
    }
}

@Composable
private fun OptionRow(
    label: String,
    priceLabel: String?,
    checked: Boolean,
    single: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (single) {
                    Modifier.selectable(selected = checked, enabled = enabled, role = Role.RadioButton, onClick = onClick)
                } else {
                    Modifier.toggleable(value = checked, enabled = enabled, role = Role.Checkbox, onValueChange = { onClick() })
                },
            )
            .alpha(if (enabled) 1f else 0.5f)
            .padding(vertical = 4.dp),
    ) {
        if (single) {
            RadioButton(selected = checked, onClick = null, enabled = enabled)
        } else {
            Checkbox(checked = checked, onCheckedChange = null, enabled = enabled)
        }
        Spacer(Modifier.width(8.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.weight(1f),
        )
        if (priceLabel != null) {
            Text(
                text = priceLabel,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
