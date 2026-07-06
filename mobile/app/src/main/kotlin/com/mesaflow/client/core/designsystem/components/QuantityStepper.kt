package com.mesaflow.client.core.designsystem.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.mesaflow.client.R
import com.mesaflow.client.core.designsystem.MesaFlowTheme

/**
 * Selector de cantidad (− n +) usado en el configurador de producto y el carrito.
 * Respeta un mínimo (por defecto 1) y un máximo opcional.
 */
@Composable
fun QuantityStepper(
    quantity: Int,
    onQuantityChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
    min: Int = 1,
    max: Int = 99,
) {
    val decreaseLabel = stringResource(R.string.stepper_decrease)
    val increaseLabel = stringResource(R.string.stepper_increase)
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        FilledTonalIconButton(
            onClick = { onQuantityChange(quantity - 1) },
            enabled = quantity > min,
            modifier = Modifier
                .size(48.dp)
                .semantics { contentDescription = decreaseLabel },
        ) {
            Text("−", style = MaterialTheme.typography.titleLarge)
        }
        Text(
            text = quantity.toString(),
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(min = 40.dp),
        )
        FilledTonalIconButton(
            onClick = { onQuantityChange(quantity + 1) },
            enabled = quantity < max,
            modifier = Modifier
                .size(48.dp)
                .semantics { contentDescription = increaseLabel },
        ) {
            Text("+", style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun QuantityStepperPreview() {
    MesaFlowTheme {
        QuantityStepper(quantity = 2, onQuantityChange = {})
    }
}
