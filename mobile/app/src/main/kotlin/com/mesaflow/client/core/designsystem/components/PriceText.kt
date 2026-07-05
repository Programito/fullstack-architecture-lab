package com.mesaflow.client.core.designsystem.components

import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.tooling.preview.Preview
import com.mesaflow.client.core.common.PriceFormatter
import com.mesaflow.client.core.designsystem.MesaFlowTheme
import com.mesaflow.client.core.designsystem.PriceTextStyle

/** Precio localizado a partir de céntimos, con estilo consistente en toda la app. */
@Composable
fun PriceText(
    amountCents: Long,
    currencyCode: String,
    modifier: Modifier = Modifier,
    style: TextStyle = PriceTextStyle,
    color: Color = LocalContentColor.current,
) {
    Text(
        text = PriceFormatter.format(amountCents, currencyCode),
        modifier = modifier,
        style = style,
        color = color,
    )
}

@Preview(showBackground = true, locale = "es")
@Composable
private fun PriceTextPreview() {
    MesaFlowTheme {
        PriceText(amountCents = 1250, currencyCode = "EUR")
    }
}
