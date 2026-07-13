package com.mesaflow.client.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface CartDao {

    @Query("SELECT * FROM cart_lines WHERE restaurantId = :restaurantId ORDER BY createdAtMillis, id")
    fun observeByRestaurant(restaurantId: String): Flow<List<CartLineEntity>>

    @Query(
        "SELECT * FROM cart_lines WHERE restaurantId = :restaurantId " +
            "AND menuItemId = :menuItemId AND selectionsJson = :selectionsJson LIMIT 1",
    )
    suspend fun findIdentical(
        restaurantId: String,
        menuItemId: String,
        selectionsJson: String,
    ): CartLineEntity?

    @Insert
    suspend fun insert(line: CartLineEntity): Long

    /** Para fusionar al editar: misma config que otra línea, pero no ella misma. */
    @Query(
        "SELECT * FROM cart_lines WHERE restaurantId = :restaurantId " +
            "AND menuItemId = :menuItemId AND selectionsJson = :selectionsJson " +
            "AND id != :excludeId LIMIT 1",
    )
    suspend fun findIdenticalExcluding(
        restaurantId: String,
        menuItemId: String,
        selectionsJson: String,
        excludeId: Long,
    ): CartLineEntity?

    @Query("UPDATE cart_lines SET quantity = :quantity WHERE id = :id")
    suspend fun updateQuantity(id: Long, quantity: Int)

    /** Guarda una edición de línea (nueva configuración/precio/cantidad) sin duplicarla. */
    @Query(
        "UPDATE cart_lines SET name = :name, imageUrl = :imageUrl, " +
            "basePriceCents = :basePriceCents, currency = :currency, " +
            "selectionsJson = :selectionsJson, quantity = :quantity WHERE id = :id",
    )
    suspend fun updateLineDetails(
        id: Long,
        name: String,
        imageUrl: String?,
        basePriceCents: Long,
        currency: String,
        selectionsJson: String,
        quantity: Int,
    )

    @Query("DELETE FROM cart_lines WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("DELETE FROM cart_lines WHERE restaurantId = :restaurantId")
    suspend fun clear(restaurantId: String)
}
