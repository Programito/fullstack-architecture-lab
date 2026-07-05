package com.mesaflow.client.core.common

import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

/**
 * Formatea precios expresados en céntimos (como los sirve el backend:
 * priceCents + currency) a texto localizado.
 *
 * Lógica pura y testeable: la UI la consume a través de PriceText.
 */
object PriceFormatter {

    fun format(amountCents: Long, currencyCode: String, locale: Locale = Locale.getDefault()): String {
        val formatter = NumberFormat.getCurrencyInstance(locale)
        runCatching { formatter.currency = Currency.getInstance(currencyCode) }
        return formatter.format(amountCents / 100.0)
    }

    /** Delta con signo explícito para extras/suplementos: "+1,50 €". */
    fun formatDelta(deltaCents: Long, currencyCode: String, locale: Locale = Locale.getDefault()): String {
        val base = format(kotlin.math.abs(deltaCents), currencyCode, locale)
        return if (deltaCents >= 0) "+$base" else "−$base"
    }
}
