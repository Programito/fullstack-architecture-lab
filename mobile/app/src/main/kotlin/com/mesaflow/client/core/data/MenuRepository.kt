package com.mesaflow.client.core.data

import com.mesaflow.client.core.common.AppResult
import com.mesaflow.client.core.common.map
import com.mesaflow.client.core.common.safeApiCall
import com.mesaflow.client.core.model.Menu
import com.mesaflow.client.core.network.MenuApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MenuRepository @Inject constructor(
    private val menuApi: MenuApi,
) {

    @Volatile
    private var cache: Pair<String, Menu>? = null

    /** Carta del restaurante, con cache en memoria por restaurante. */
    suspend fun getMenu(restaurantId: String, forceRefresh: Boolean = false): AppResult<Menu> {
        if (!forceRefresh) {
            cache?.let { (cachedId, menu) ->
                if (cachedId == restaurantId) return AppResult.Success(menu)
            }
        }
        return safeApiCall { menuApi.menu(restaurantId) }
            .map { it.toDomain() }
            .also { result ->
                if (result is AppResult.Success) cache = restaurantId to result.data
            }
    }
}
