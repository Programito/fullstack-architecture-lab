package com.mesaflow.client.core.database.di

import android.content.Context
import androidx.room.Room
import com.mesaflow.client.core.database.CartDao
import com.mesaflow.client.core.database.MesaFlowDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): MesaFlowDatabase =
        Room.databaseBuilder(context, MesaFlowDatabase::class.java, "mesaflow.db")
            // v1: solo carrito local; si cambia el esquema antes de release,
            // regenerar es más simple que migrar un carrito efímero.
            .fallbackToDestructiveMigration(dropAllTables = true)
            .build()

    @Provides
    fun provideCartDao(database: MesaFlowDatabase): CartDao = database.cartDao()
}
