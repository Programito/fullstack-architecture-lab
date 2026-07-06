package com.mesaflow.client.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Línea de carrito persistida. Las selecciones (extras, combo, "sin X") se
 * guardan como JSON en [selectionsJson]: no se consultan por columnas y así
 * evitamos un esquema relacional innecesario para un carrito local.
 */
@Entity(tableName = "cart_lines")
data class CartLineEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0L,
    val restaurantId: String,
    val menuItemId: String,
    val restaurantProductId: String?,
    val name: String,
    val imageUrl: String?,
    val basePriceCents: Long,
    val currency: String,
    val quantity: Int,
    val selectionsJson: String,
    val createdAtMillis: Long,
)
