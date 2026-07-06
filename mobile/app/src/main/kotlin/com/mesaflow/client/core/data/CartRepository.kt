package com.mesaflow.client.core.data

import com.mesaflow.client.core.database.CartDao
import com.mesaflow.client.core.database.CartLineEntity
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
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

    fun cart(restaurantId: String): Flow<List<CartLine>> =
        cartDao.observeByRestaurant(restaurantId).map { lines -> lines.map { it.toDomain() } }

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

    suspend fun clear(restaurantId: String) = cartDao.clear(restaurantId)

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
