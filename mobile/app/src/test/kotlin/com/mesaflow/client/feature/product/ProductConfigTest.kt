package com.mesaflow.client.feature.product

import com.mesaflow.client.core.model.ComboDefinition
import com.mesaflow.client.core.model.ComboSlot
import com.mesaflow.client.core.model.ComboSlotOption
import com.mesaflow.client.core.model.MenuItem
import com.mesaflow.client.core.model.ModifierGroup
import com.mesaflow.client.core.model.ModifierOption
import com.mesaflow.client.core.model.PlatterComponent
import com.mesaflow.client.core.model.ProductType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProductConfigTest {

    private val sauceGroup = ModifierGroup(
        id = "g-sauce",
        name = "Salsa",
        singleSelection = true,
        minSelections = 1,
        maxSelections = 1,
        isRequired = true,
        options = listOf(
            ModifierOption("o-brava", "Brava", priceDeltaCents = 0, isAvailable = true),
            ModifierOption("o-alioli", "Alioli", priceDeltaCents = 50, isAvailable = true),
        ),
    )

    private val extrasGroup = ModifierGroup(
        id = "g-extras",
        name = "Extras",
        singleSelection = false,
        minSelections = 0,
        maxSelections = 2,
        isRequired = false,
        options = listOf(
            ModifierOption("o-bacon", "Bacon", priceDeltaCents = 150, isAvailable = true),
            ModifierOption("o-queso", "Queso", priceDeltaCents = 100, isAvailable = true),
            ModifierOption("o-huevo", "Huevo", priceDeltaCents = 120, isAvailable = true),
        ),
    )

    private val drinkSlot = ComboSlot(
        id = "s-drink",
        name = "Bebida",
        minSelections = 1,
        maxSelections = 1,
        isRequired = true,
        options = listOf(
            ComboSlotOption("c-agua", "p-agua", "Agua", 0, true),
            ComboSlotOption("c-cola", "p-cola", "Cola", 80, true),
        ),
    )

    private fun item(
        groups: List<ModifierGroup> = emptyList(),
        combo: ComboDefinition? = null,
        platter: List<PlatterComponent> = emptyList(),
        priceCents: Long = 1000,
    ) = MenuItem(
        id = "item-1",
        restaurantProductId = "prod-1",
        name = "Burger",
        description = null,
        imageUrl = null,
        productType = ProductType.SIMPLE,
        priceCents = priceCents,
        currency = "EUR",
        isAvailable = true,
        modifierGroups = groups,
        comboDefinition = combo,
        platterComponents = platter,
    )

    @Test
    fun `producto simple sin grupos es valido y usa el precio base`() {
        val config = ProductConfig(item())
        assertTrue(config.isValid)
        assertEquals(1000, config.unitPriceCents)
        assertEquals(1000, config.totalCents)
    }

    @Test
    fun `grupo requerido sin seleccion invalida la configuracion`() {
        val config = ProductConfig(item(groups = listOf(sauceGroup)))
        assertFalse(config.isValid)
        assertTrue(config.toggleModifier(sauceGroup, "o-brava").isValid)
    }

    @Test
    fun `seleccion unica reemplaza la opcion anterior`() {
        val config = ProductConfig(item(groups = listOf(sauceGroup)))
            .toggleModifier(sauceGroup, "o-brava")
            .toggleModifier(sauceGroup, "o-alioli")
        assertEquals(setOf("o-alioli"), config.optionsByGroup["g-sauce"])
        assertEquals(1050, config.unitPriceCents)
    }

    @Test
    fun `seleccion multiple respeta el maximo y permite destogglear`() {
        var config = ProductConfig(item(groups = listOf(extrasGroup)))
            .toggleModifier(extrasGroup, "o-bacon")
            .toggleModifier(extrasGroup, "o-queso")
            .toggleModifier(extrasGroup, "o-huevo") // supera max=2: ignorada
        assertEquals(setOf("o-bacon", "o-queso"), config.optionsByGroup["g-extras"])
        assertEquals(1000 + 150 + 100, config.unitPriceCents)

        config = config.toggleModifier(extrasGroup, "o-queso") // quita
        assertEquals(setOf("o-bacon"), config.optionsByGroup["g-extras"])
    }

    @Test
    fun `combo requiere slot y suma suplementos`() {
        val combo = ComboDefinition(id = "combo-1", slots = listOf(drinkSlot))
        var config = ProductConfig(item(combo = combo))
        assertFalse(config.isValid)

        config = config.toggleComboOption(drinkSlot, "c-cola")
        assertTrue(config.isValid)
        assertEquals(1080, config.unitPriceCents)
    }

    @Test
    fun `solo se pueden quitar componentes removibles`() {
        val platter = listOf(
            PlatterComponent("pc-onion", "Cebolla", removable = true, replaceable = false, sortOrder = 0),
            PlatterComponent("pc-meat", "Carne", removable = false, replaceable = false, sortOrder = 1),
        )
        val config = ProductConfig(item(platter = platter))
            .toggleRemovedComponent("pc-onion")
            .toggleRemovedComponent("pc-meat") // no removible: ignorado
        assertEquals(setOf("pc-onion"), config.removedComponentIds)
    }

    @Test
    fun `toCartLine congela selecciones cantidad y precio`() {
        val combo = ComboDefinition(id = "combo-1", slots = listOf(drinkSlot))
        val platter = listOf(
            PlatterComponent("pc-onion", "Cebolla", removable = true, replaceable = false, sortOrder = 0),
        )
        val line = ProductConfig(item(groups = listOf(extrasGroup), combo = combo, platter = platter))
            .toggleModifier(extrasGroup, "o-bacon")
            .toggleComboOption(drinkSlot, "c-cola")
            .toggleRemovedComponent("pc-onion")
            .withQuantity(3)
            .toCartLine()

        assertEquals("item-1", line.menuItemId)
        assertEquals(3, line.quantity)
        assertEquals(1000 + 150 + 80, line.unitPriceCents)
        assertEquals((1000 + 150 + 80) * 3, line.totalCents)
        assertEquals(listOf("o-bacon"), line.selections.modifiers.map { it.optionId })
        assertEquals(listOf("c-cola"), line.selections.comboOptions.map { it.optionId })
        assertEquals(listOf("pc-onion"), line.selections.removedComponents.map { it.componentId })
    }

    @Test
    fun `la cantidad queda acotada entre 1 y el maximo`() {
        val config = ProductConfig(item())
        assertEquals(1, config.withQuantity(0).quantity)
        assertEquals(ProductConfig.MAX_QUANTITY, config.withQuantity(500).quantity)
    }
}
