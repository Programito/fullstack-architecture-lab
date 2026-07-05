package com.mesaflow.client.core.network

import com.mesaflow.client.core.network.dto.RestaurantMenuDto
import retrofit2.http.GET
import retrofit2.http.Path

/** Carta del restaurante (GET /api/v1/restaurants/:id/menu). */
interface MenuApi {

    @GET("restaurants/{restaurantId}/menu")
    suspend fun menu(@Path("restaurantId") restaurantId: String): RestaurantMenuDto
}
