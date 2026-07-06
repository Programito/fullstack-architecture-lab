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

    @Query("UPDATE cart_lines SET quantity = :quantity WHERE id = :id")
    suspend fun updateQuantity(id: Long, quantity: Int)

    @Query("DELETE FROM cart_lines WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("DELETE FROM cart_lines WHERE restaurantId = :restaurantId")
    suspend fun clear(restaurantId: String)
}
