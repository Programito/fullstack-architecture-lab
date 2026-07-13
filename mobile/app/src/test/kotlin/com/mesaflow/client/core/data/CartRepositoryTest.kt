package com.mesaflow.client.core.data

import com.mesaflow.client.core.database.CartDao
import com.mesaflow.client.core.database.CartLineEntity
import com.mesaflow.client.core.model.CartLine
import com.mesaflow.client.core.model.CartSelections
import com.mesaflow.client.core.model.SelectedModifier
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** DAO en memoria: mismas garantías observables que Room para estos tests. */
private class FakeCartDao : CartDao {
    private val lines = MutableStateFlow<List<CartLineEntity>>(emptyList())
    private var nextId = 1L

    override fun observeByRestaurant(restaurantId: String): Flow<List<CartLineEntity>> =
        lines.map { all -> all.filter { it.restaurantId == restaurantId } }

    override suspend fun findIdentical(
        restaurantId: String,
        menuItemId: String,
        selectionsJson: String,
    ): CartLineEntity? = lines.value.firstOrNull {
        it.restaurantId == restaurantId && it.menuItemId == menuItemId &&
            it.selectionsJson == selectionsJson
    }

    override suspend fun insert(line: CartLineEntity): Long {
        val id = nextId++
        lines.value += line.copy(id = id)
        return id
    }

    override suspend fun findIdenticalExcluding(
        restaurantId: String,
        menuItemId: String,
        selectionsJson: String,
        excludeId: Long,
    ): CartLineEntity? = lines.value.firstOrNull {
        it.restaurantId == restaurantId && it.menuItemId == menuItemId &&
            it.selectionsJson == selectionsJson && it.id != excludeId
    }

    override suspend fun updateQuantity(id: Long, quantity: Int) {
        lines.value = lines.value.map { if (it.id == id) it.copy(quantity = quantity) else it }
    }

    override suspend fun updateLineDetails(
        id: Long,
        name: String,
        imageUrl: String?,
        basePriceCents: Long,
        currency: String,
        selectionsJson: String,
        quantity: Int,
    ) {
        lines.value = lines.value.map {
            if (it.id == id) {
                it.copy(
                    name = name,
                    imageUrl = imageUrl,
                    basePriceCents = basePriceCents,
                    currency = currency,
                    selectionsJson = selectionsJson,
                    quantity = quantity,
                )
            } else {
                it
            }
        }
    }

    override suspend fun delete(id: Long) {
        lines.value = lines.value.filterNot { it.id == id }
    }

    override suspend fun clear(restaurantId: String) {
        lines.value = lines.value.filterNot { it.restaurantId == restaurantId }
    }
}

class CartRepositoryTest {

    private val dao = FakeCartDao()
    private val repository = CartRepository(dao, Json)

    private fun line(
        menuItemId: String = "item-1",
        quantity: Int = 1,
        selections: CartSelections = CartSelections(),
    ) = CartLine(
        menuItemId = menuItemId,
        restaurantProductId = "prod-1",
        name = "Burger",
        imageUrl = null,
        basePriceCents = 1000,
        currency = "EUR",
        quantity = quantity,
        selections = selections,
    )

    private val withBacon = CartSelections(
        modifiers = listOf(SelectedModifier("g1", "Extras", "o-bacon", "Bacon", 150)),
    )

    @Test
    fun `añadir la misma configuracion dos veces suma cantidades`() = runTest {
        repository.add("rest-1", line(quantity = 1))
        repository.add("rest-1", line(quantity = 2))

        val cart = repository.cart("rest-1").first()
        assertEquals(1, cart.size)
        assertEquals(3, cart.first().quantity)
    }

    @Test
    fun `configuraciones distintas crean lineas separadas`() = runTest {
        repository.add("rest-1", line())
        repository.add("rest-1", line(selections = withBacon))

        val cart = repository.cart("rest-1").first()
        assertEquals(2, cart.size)
        val bacon = cart.first { !it.selections.isEmpty }
        assertEquals(1150, bacon.unitPriceCents)
    }

    @Test
    fun `updateQuantity a cero elimina la linea`() = runTest {
        repository.add("rest-1", line())
        val id = repository.cart("rest-1").first().first().id

        repository.updateQuantity(id, 0)
        assertTrue(repository.cart("rest-1").first().isEmpty())
    }

    @Test
    fun `el carrito esta separado por restaurante y clear solo vacia el suyo`() = runTest {
        repository.add("rest-1", line())
        repository.add("rest-2", line())

        repository.clear("rest-1")
        assertTrue(repository.cart("rest-1").first().isEmpty())
        assertEquals(1, repository.cart("rest-2").first().size)
    }

    @Test
    fun `las selecciones sobreviven el ciclo de persistencia`() = runTest {
        repository.add("rest-1", line(selections = withBacon))

        val restored = repository.cart("rest-1").first().first()
        assertEquals(withBacon, restored.selections)
        assertEquals(1150, restored.unitPriceCents)
    }

    @Test
    fun `markSubmissionFailed marca el aviso y clear lo limpia`() = runTest {
        assertFalse(repository.hasFailedSubmission("rest-1").first())

        repository.markSubmissionFailed("rest-1")
        assertTrue(repository.hasFailedSubmission("rest-1").first())

        repository.clear("rest-1")
        assertFalse(repository.hasFailedSubmission("rest-1").first())
    }

    @Test
    fun `el aviso de fallo esta aislado por restaurante`() = runTest {
        repository.markSubmissionFailed("rest-1")

        assertTrue(repository.hasFailedSubmission("rest-1").first())
        assertFalse(repository.hasFailedSubmission("rest-2").first())
    }

    @Test
    fun `editar una linea sin colision actualiza sus datos in place`() = runTest {
        repository.add("rest-1", line(quantity = 1))
        val id = repository.cart("rest-1").first().first().id

        repository.updateLine("rest-1", id, line(quantity = 2, selections = withBacon))

        val cart = repository.cart("rest-1").first()
        assertEquals(1, cart.size)
        assertEquals(id, cart.first().id)
        assertEquals(2, cart.first().quantity)
        assertEquals(withBacon, cart.first().selections)
    }

    @Test
    fun `editar hasta coincidir con otra linea fusiona cantidades y borra la editada`() = runTest {
        // Coca-Cola Grande (sin selecciones) x1 y Coca-Cola XL (con bacon simula el tamaño) x1.
        repository.add("rest-1", line(quantity = 1))
        repository.add("rest-1", line(quantity = 1, selections = withBacon))
        val cart = repository.cart("rest-1").first()
        val grandeId = cart.first { it.selections.isEmpty }.id
        val xlId = cart.first { !it.selections.isEmpty }.id

        // Edita la "Grande" para que pase a tener la misma config que la "XL".
        repository.updateLine("rest-1", grandeId, line(quantity = 1, selections = withBacon))

        val result = repository.cart("rest-1").first()
        assertEquals(1, result.size)
        assertEquals(xlId, result.first().id)
        assertEquals(2, result.first().quantity)
    }

    @Test
    fun `editar respeta el tope maximo de cantidad al fusionar`() = runTest {
        repository.add("rest-1", line(quantity = 98))
        repository.add("rest-1", line(quantity = 50, selections = withBacon))
        val editedId = repository.cart("rest-1").first().first { it.selections.isEmpty }.id

        repository.updateLine("rest-1", editedId, line(quantity = 50, selections = withBacon))

        val result = repository.cart("rest-1").first()
        assertEquals(1, result.size)
        assertEquals(99, result.first().quantity)
    }
}
