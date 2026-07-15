package com.mesaflow.client.core.data

import com.mesaflow.client.core.common.AppError
import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.common.map
import com.mesaflow.client.core.common.safeApiCall
import com.mesaflow.client.core.model.CartSelections
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.PaidOrderLine
import com.mesaflow.client.core.model.PaymentMethod
import com.mesaflow.client.core.model.PaymentResult
import com.mesaflow.client.core.model.RemovedComponent
import com.mesaflow.client.core.model.SelectedComboOption
import com.mesaflow.client.core.model.SelectedModifier
import com.mesaflow.client.core.model.ServicePointOrderStatus
import com.mesaflow.client.core.model.SubmittedOrder
import com.mesaflow.client.core.network.OrdersApi
import com.mesaflow.client.core.network.dto.OpenOrderRequestDto
import com.mesaflow.client.core.network.dto.OrderLineDto
import com.mesaflow.client.core.network.dto.OrderSummaryDto
import com.mesaflow.client.core.network.dto.RegisterPaymentRequestDto
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Prepara el pedido de la mesa en backend: abre (o recupera) el pedido activo
 * y añade las líneas una a una. La comanda no se envía todavía a cocina; eso
 * ocurre al completar el pago. El carrito solo se vacía si todo este paso va
 * bien; ante cualquier fallo se conserva para reintentar sin perder la
 * configuración del cliente.
 */
@Singleton
class OrderRepository @Inject constructor(
    private val ordersApi: OrdersApi,
    private val cartRepository: CartRepository,
) {

    suspend fun submitCart(
        restaurantId: String,
        tableId: String,
        lines: List<CartLine>,
    ): AppResult<SubmittedOrder> {
        // Errores de validación (carrito vacío, línea sin producto real) no
        // llegan a tocar la red: no marcamos aviso persistente para ellos,
        // porque el usuario los ve al instante en la misma pantalla y
        // reintentar sin cambiar nada fallaría igual.
        if (lines.isEmpty()) return AppResult.Error(AppError.Validation)

        val requests = lines.map { it.toAddLineRequest() ?: return AppResult.Error(AppError.Validation) }

        val orderId = when (val opened = safeApiCall {
            ordersApi.openOrder(restaurantId, tableId, OpenOrderRequestDto(guestCount = 1))
        }) {
            is AppResult.Success -> opened.data.order.id
            is AppResult.Error -> {
                cartRepository.markSubmissionFailed(restaurantId)
                return opened
            }
        }

        var lastSummary: OrderSummaryDto? = null
        for (request in requests) {
            when (val added = safeApiCall { ordersApi.addLine(restaurantId, orderId, request) }) {
                is AppResult.Success -> lastSummary = added.data.order
                is AppResult.Error -> {
                    cartRepository.markSubmissionFailed(restaurantId)
                    return added
                }
            }
        }
        val summary = lastSummary ?: return AppResult.Error(AppError.Unknown(null))

        // Éxito total de la preparación del pedido: limpia tanto el carrito
        // como cualquier aviso de fallo previo. El envío a cocina queda
        // delegado al flujo de pago en backend.
        cartRepository.clear(restaurantId)
        return AppResult.Success(
            SubmittedOrder(
                orderId = orderId,
                status = summary.status,
                dailyNumber = summary.dailyNumber,
                subtotalCents = summary.subtotalCents,
                taxCents = summary.taxCents,
                totalCents = summary.totalCents,
                currency = summary.currency,
            ),
        )
    }

    /**
     * Registra el pago del pedido (Fase 7). La "pasarela" es mock — no hay
     * cobro real — pero el registro en el backend sí es real: el pedido queda
     * pagado y la mesa lista para liberarse desde el POS.
     */
    suspend fun pay(
        restaurantId: String,
        orderId: String,
        amountCents: Long,
        method: PaymentMethod,
    ): AppResult<PaymentResult> {
        if (amountCents <= 0) return AppResult.Error(AppError.Validation)
        return safeApiCall {
            ordersApi.registerPayment(
                restaurantId = restaurantId,
                orderId = orderId,
                body = RegisterPaymentRequestDto(amountCents = amountCents, method = method.apiValue),
            )
        }.map { response ->
            PaymentResult(
                orderId = response.order.id,
                status = response.order.status,
                dailyNumber = response.order.dailyNumber,
                paidCents = response.order.paidCents,
                balanceCents = response.order.balanceCents,
                currency = response.order.currency,
                lines = response.lines.map { it.toPaidOrderLine(response.order.currency) },
            )
        }
    }

    suspend fun freeTable(restaurantId: String, tableId: String): AppResult<Unit> =
        safeApiCall { ordersApi.freeServicePoint(restaurantId, tableId) }

    /**
     * Estado en vivo (por sondeo, ver [com.mesaflow.client.feature.cart.CartViewModel])
     * del pedido activo de la mesa, con el estado de cada línea en cocina.
     * Mismo endpoint que usa el panel de sala/cocina para la misma mesa.
     */
    suspend fun getServicePointOrder(
        restaurantId: String,
        tableId: String,
    ): AppResult<ServicePointOrderStatus> =
        safeApiCall { ordersApi.getServicePointOrder(restaurantId, tableId) }
            .map { it.toServicePointOrderStatus() }

    private fun OrderLineDto.toPaidOrderLine(currency: String): PaidOrderLine =
        PaidOrderLine(
            menuItemId = productId ?: restaurantProductId ?: id,
            restaurantProductId = restaurantProductId,
            name = productName,
            quantity = quantity,
            basePriceCents = basePriceCents,
            totalCents = subtotalCents,
            currency = currency,
            selections = CartSelections(
                modifiers = modifiers.mapIndexed { index, modifier ->
                    SelectedModifier(
                        groupId = "payment-group-$index",
                        groupName = "",
                        optionId = "payment-modifier-$index",
                        optionName = modifier.optionName,
                        priceDeltaCents = 0,
                    )
                },
                comboOptions = comboSlots.mapIndexed { index, slot ->
                    SelectedComboOption(
                        slotId = "payment-slot-$index",
                        slotName = "",
                        optionId = "payment-option-$index",
                        restaurantProductId = restaurantProductId ?: id,
                        optionName = slot.selectedProductName,
                        supplementPriceCents = 0,
                    )
                },
                removedComponents = platterComponents
                    .filter { it.removed }
                    .mapIndexed { index, component ->
                        RemovedComponent(
                            componentId = "payment-removed-$index",
                            name = component.componentName,
                        )
                    },
            ),
        )
}
