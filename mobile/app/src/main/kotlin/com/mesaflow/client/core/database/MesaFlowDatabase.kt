package com.mesaflow.client.core.database

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [CartLineEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class MesaFlowDatabase : RoomDatabase() {
    abstract fun cartDao(): CartDao
}
