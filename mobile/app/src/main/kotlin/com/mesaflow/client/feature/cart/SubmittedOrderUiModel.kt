package com.mesaflow.client.feature.cart

import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.ServicePointOrderLine

internal fun submittedOrderPrimaryTotalCents(
    submittedLines: List<CartLine>,
    fallbackTotalCents: Long,
): Long = submittedLines.sumOf { it.totalCents }.takeIf { it > 0L } ?: fallbackTotalCents

internal fun reconcileCartUiStateWithLines(
    uiState: CartUiState,
    liveLines: List<CartLine>,
): CartUiState = if (uiState.submitted != null && liveLines.isNotEmpty()) {
    uiState.copy(
        submitted = null,
        submittedLines = emptyList(),
        tableLabel = "",
    )
} else {
    uiState
}

internal fun filterSubmittedProgressLines(
    polledLines: List<ServicePointOrderLine>,
    submittedLines: List<CartLine>,
): List<ServicePointOrderLine> {
    if (submittedLines.isEmpty()) return polledLines

    val remainingQuantities = submittedLines
        .groupingBy { it.name }
        .fold(0) { acc, line -> acc + line.quantity }
        .toMutableMap()

    return buildList {
        for (line in polledLines) {
            val remaining = remainingQuantities[line.productName] ?: 0
            if (remaining <= 0) continue

            val matchedQuantity = minOf(line.quantity, remaining)
            remainingQuantities[line.productName] = remaining - matchedQuantity
            add(
                if (matchedQuantity == line.quantity) {
                    line
                } else {
                    line.copy(quantity = matchedQuantity)
                },
            )
        }
    }
}
