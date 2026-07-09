package com.mesaflow.client.core.data

import com.mesaflow.client.core.database.CartDao
import com.mesaflow.client.core.database.CartLineEntity
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.serialization.json.Json

/**
 * Carrito persistente (Room). Regla de negocio principal: añadir un producto
 * con una configuración idéntica a una línea existente suma cantidades en vez
 * de duplicar la línea. El JSON de selecciones se serializa de forma estable
 * para que esa comparación por igualdad sea fiable.
 */
@Singleton
class CartRepository @Inject constructor(
    private val cartDao: CartDao,
    private val json: Json,
) {

    /**
     * Restaurantes cuyo último intento de envío (OrderRepository.submitCart)
     * falló y no se ha vuelto a intentar con éxito. Vive solo en memoria (no
     * necesita sobrevivir a la muerte del proceso): sirve para avisar en la
     * Carta aunque el cliente haya salido del Carrito sin reintentar desde
     * el Snackbar de error.
     */
    private val failedSubmission = MutableStateFlow<Set<String>>(emptySet())

    fun cart(restaurantId: String): Flow<List<CartLine>> =
        cartDao.observeByRestaurant(restaurantId).map { lines -> lines.map { it.toDomain() } }

    /** true si el envío de este restaurante falló y sigue sin resolverse. */
    fun hasFailedSubmission(restaurantId: String): Flow<Boolean> =
        failedSubmission.map { it.contains(restaurantId) }

    /** Marca el fallo; lo llama OrderRepository cuando submitCart no llega a completarse. */
    fun markSubmissionFailed(restaurantId: String) {
        failedSubmission.update { it + restaurantId }
    }

    /** Añade una línea; si ya existe la misma configuración, acumula cantidad. */
    suspend fun add(restaurantId: String, line: CartLine) {
        val selectionsJson = json.encodeToString(CartSelections.serializer(), line.selections)
        val existing = cartDao.findIdentical(restaurantId, line.menuItemId, selectionsJson)
        if (existing != null) {
            val merged = (existing.quantity + line.quantity).coerceAtMost(MAX_QUANTITY)
            cartDao.updateQuantity(existing.id, merged)
            return
        }
        cartDao.insert(
            CartLineEntity(
                restaurantId = restaurantId,
                menuItemId = line.menuItemId,
                restaurantProductId = line.restaurantProductId,
                name = line.name,
                imageUrl = line.imageUrl,
                basePriceCents = line.basePriceCents,
                currency = line.currency,
                quantity = line.quantity,
                selectionsJson = selectionsJson,
                createdAtMillis = System.currentTimeMillis(),
            ),
        )
    }

    /** Cambia la cantidad de una línea; a 0 o menos, la elimina. */
    suspend fun updateQuantity(lineId: Long, quantity: Int) {
        if (quantity <= 0) {
            cartDao.delete(lineId)
        } else {
            cartDao.updateQuantity(lineId, quantity.coerceAtMost(MAX_QUANTITY))
        }
    }

    suspend fun remove(lineId: Long) = cartDao.delete(lineId)

    suspend fun clear(restaurantId: String) {
        cartDao.clear(restaurantId)
        failedSubmission.update { it - restaurantId }
    }

    private fun CartLineEntity.toDomain(): CartLine = CartLine(
        id = id,
        menuItemId = menuItemId,
        restaurantProductId = restaurantProductId,
        name = name,
        imageUrl = imageUrl,
        basePriceCents = basePriceCents,
        currency = currency,
        quantity = quantity,
        selections = runCatching {
            json.decodeFromString(CartSelections.serializer(), selectionsJson)
        }.getOrDefault(CartSelections()),
    )

    private companion object {
        const val MAX_QUANTITY = 99
    }
}
