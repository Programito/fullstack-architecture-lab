package com.mesaflow.client.core.designsystem.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.mesaflow.client.core.designsystem.MesaFlowTheme

/** Chip de categoría de la carta (fila horizontal bajo el buscador). */
@Composable
fun CategoryChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        modifier = modifier,
        colors = FilterChipDefaults.filterChipColors(),
    )
}

@Preview(showBackground = true)
@Composable
private fun CategoryChipPreview() {
    MesaFlowTheme {
        var selected by remember { mutableStateOf(0) }
        Row(
            modifier = Modifier.padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf("Todo", "Principales", "Postres").forEachIndexed { index, label ->
                CategoryChip(label = label, selected = selected == index, onClick = { selected = index })
            }
        }
    }
}
