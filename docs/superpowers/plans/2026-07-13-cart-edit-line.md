# Plan: editar líneas del carrito (móvil)

## Objetivo

En `CartScreen`, poder editar una línea ya añadida (tamaño, extras, combo,
ingredientes quitados) reabriendo el mismo configurador que se usa al añadir
desde la Carta. Al guardar, si la nueva configuración coincide exactamente
con otra línea ya existente en el carrito (mismo producto + mismas
selecciones), se deben **fusionar cantidades** en esa línea existente y
eliminar la que se estaba editando — igual que ya ocurre hoy al *añadir* un
producto idéntico dos veces (`CartRepository.add`).

Ejemplo del enunciado: carrito con "Coca-Cola Grande" x1 y "Coca-Cola XL" x1
(dos líneas). Si editas la primera y cambias el tamaño a XL, el resultado
debe ser una sola línea "Coca-Cola XL" x2.

**Aclaración de esta iteración:** el botón de editar solo tiene sentido si el
producto tiene algo configurable (tamaño/variantes, extras, combo o
ingredientes quitables). Un producto simple sin ninguna de esas opciones
(p.ej. "Croquetas de jamón ibérico" en la captura) no muestra el lápiz de
editar — se queda igual que ahora, solo con `-`/`+` y eliminar. Esto se
decide por el `MenuItem` (si tiene `modifierGroups`, `comboDefinition.slots`
o `platterComponents` quitables), no por si la línea tiene ya selecciones
elegidas — así un extra opcional que hoy no se marcó igualmente permite
editar más adelante.

## Estado actual (contexto ya revisado en el código)

- `CartLine` (`core/model/Cart.kt`) guarda `menuItemId` + `CartSelections`
  (modifiers/comboOptions/removedComponents), no el `MenuItem` completo.
- `CartRepository.add()` ya implementa la regla de fusión por igualdad de
  `selectionsJson` (Room, `CartDao.findIdentical`), pero solo para *añadir*.
  No existe ningún método para *actualizar* una línea existente cambiando su
  configuración.
- `CartScreen`/`CartViewModel` hoy solo permiten cambiar cantidad
  (`QuantityStepper`) o eliminar la línea (`Delete`). No hay botón de editar.
- El configurador de producto (`ProductConfig` + `ProductConfiguratorSheet` /
  `ProductConfiguratorContent`, en `feature/product/`) ya contiene toda la
  lógica de selección/validación/precio que se necesita para editar — solo
  falta poder **precargarlo** con la configuración actual de una línea en
  vez de partir de cero, y decírselo a un `MenuItem` (que `CartViewModel` hoy
  no tiene: solo `MenuViewModel` carga la carta).
- `MenuRepository.getMenu()` cachea la carta en memoria por restaurante, así
  que se puede reutilizar sin duplicar llamadas de red.

## Pasos

### 1. `ProductConfig`: reconstruir configuración desde una `CartLine`

Añadir en `feature/product/ProductConfig.kt` una factory que sea la inversa
de `toCartLine()`:

```kotlin
companion object {
    const val MAX_QUANTITY = 99

    fun fromCartLine(item: MenuItem, line: CartLine): ProductConfig = ProductConfig(
        item = item,
        quantity = line.quantity,
        optionsByGroup = item.modifierGroups
            .associate { group ->
                group.id to line.selections.modifiers
                    .filter { it.groupId == group.id }
                    .map { it.optionId }
                    .toSet()
            }
            .filterValues { it.isNotEmpty() },
        optionsBySlot = item.comboDefinition?.slots.orEmpty()
            .associate { slot ->
                slot.id to line.selections.comboOptions
                    .filter { it.slotId == slot.id }
                    .map { it.optionId }
                    .toSet()
            }
            .filterValues { it.isNotEmpty() },
        removedComponentIds = line.selections.removedComponents.map { it.componentId }.toSet(),
    )
}
```

Esto recalcula el precio a partir del `MenuItem` **actual** (si el
restaurante cambió precios desde que se añadió al carrito, se refleja al
editar — igual que pasaría si lo añadieras de nuevo).

Test unitario: `ProductConfig.fromCartLine(item, config.toCartLine())` debe
reproducir `optionsByGroup`/`optionsBySlot`/`removedComponentIds`/`quantity`
originales (round-trip), para varias combinaciones (single/multi, combo,
platter).

### 2. `ProductConfiguratorSheet` / `Content`: modo edición

Hoy `ProductConfiguratorSheet`/`Panel` siempre arrancan con
`ProductConfig(item)` (vacío) y el botón dice "Añadir · $X"
(`configurator_add_for`). Hace falta:

- Parámetro nuevo `initialConfig: ProductConfig = ProductConfig(item)` en
  `ProductConfiguratorSheet`, `ProductConfiguratorPanel` y
  `ProductConfiguratorContent`, usado como valor inicial de
  `remember(item.id) { mutableStateOf(initialConfig) }`.
- Parámetro `isEditing: Boolean = false` (o directamente pasar el
  string-res del botón) para cambiar la etiqueta del botón de confirmar:
  nueva string `configurator_save_for` ("Guardar · %1$s") junto a la
  existente `configurator_add_for`. El callback sigue siendo
  `(CartLine) -> Unit`; quien reciba la `CartLine` decide si es un alta o
  una edición (ver punto 4), así no hace falta tocar la firma del callback.

No hace falta un botón "cancelar edición sin guardar" adicional: el
`onDismiss` existente (swipe-down del bottom sheet / botón cerrar del panel)
ya cubre ese caso.

### 3. `CartRepository`: nuevo método `updateLine`

En `core/data/CartRepository.kt`, añadir:

```kotlin
suspend fun updateLine(restaurantId: String, lineId: Long, updated: CartLine) {
    val selectionsJson = json.encodeToString(CartSelections.serializer(), updated.selections)
    val existing = cartDao.findIdenticalExcluding(restaurantId, updated.menuItemId, selectionsJson, lineId)
    if (existing != null) {
        // Misma config que otra línea ya en el carrito: fusiona cantidades
        // y descarta la línea editada (igual regla que add()).
        val merged = (existing.quantity + updated.quantity).coerceAtMost(MAX_QUANTITY)
        cartDao.updateQuantity(existing.id, merged)
        cartDao.delete(lineId)
    } else {
        cartDao.updateLineDetails(
            id = lineId,
            name = updated.name,
            imageUrl = updated.imageUrl,
            basePriceCents = updated.basePriceCents,
            currency = updated.currency,
            selectionsJson = selectionsJson,
            quantity = updated.quantity.coerceAtMost(MAX_QUANTITY),
        )
    }
}
```

En `core/database/CartDao.kt`, dos queries nuevas:

```kotlin
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
```

(Se mantiene el mismo estilo que `add()`: sin `@Transaction` explícito,
coherente con el resto del repositorio — es Room local, secuencial dentro
de una misma corrutina.)

Tests en `CartRepositoryTest`: (a) editar sin colisión actualiza la línea in
place; (b) editar hasta que coincide con otra línea existente fusiona
cantidades (con tope `MAX_QUANTITY`) y borra la línea editada; (c) el caso
del enunciado (Grande→XL con una XL ya en el carrito) como test explícito.

### 4. `CartViewModel`: estado, mapa de la carta y acciones de edición

Añadir a `core/model/Menu.kt`:

```kotlin
/** Tiene algo que configurar (tamaño/variantes, extras, combo o ingredientes quitables). */
val MenuItem.isConfigurable: Boolean
    get() = modifierGroups.isNotEmpty() ||
        comboDefinition?.slots.orEmpty().isNotEmpty() ||
        platterComponents.any { it.removable }

fun Menu.findItemById(itemId: String): MenuItem? =
    sections.asSequence().flatMap { it.items.asSequence() }.firstOrNull { it.id == itemId }
```

(`findItemById` ya existe como función privada en `MenuViewModel.kt` — se
mueve aquí como extensión pública para no duplicarla; `MenuViewModel` pasa a
usar esta.)

Inyectar `MenuRepository` en `CartViewModel` (ya es `@Singleton`, se puede
añadir al constructor sin más). Se necesita la carta cargada **por
adelantado** (no solo al pulsar editar), porque decide qué líneas muestran
el lápiz de editar. Nuevo estado derivado:

```kotlin
/** id de MenuItem -> MenuItem, para saber por línea si es editable. */
private val menuItemsById: StateFlow<Map<String, MenuItem>> = sessionStore.tableContext
    .filterNotNull()
    .map { table -> (menuRepository.getMenu(table.restaurantId) as? AppResult.Success)?.data }
    .map { menu -> menu?.sections.orEmpty().flatMap { it.items }.associateBy { it.id } }
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyMap())
```

Añadir a `CartUiState`:

```kotlin
val editingLine: CartLine? = null,
val editingItem: MenuItem? = null,
```

Nuevas funciones:

```kotlin
/** true si esta línea tiene algo configurable y por tanto debe mostrar el lápiz de editar. */
fun isLineEditable(line: CartLine): Boolean =
    menuItemsById.value[line.menuItemId]?.isConfigurable == true

fun onEditLine(line: CartLine) {
    val item = menuItemsById.value[line.menuItemId] ?: return
    _uiState.update { it.copy(editingLine = line, editingItem = item) }
}

fun onEditDismiss() {
    _uiState.update { it.copy(editingLine = null, editingItem = null) }
}

fun onEditConfirm(updated: CartLine) {
    val lineId = _uiState.value.editingLine?.id ?: return
    viewModelScope.launch {
        val table = sessionStore.tableContext.first() ?: return@launch
        cartRepository.updateLine(table.restaurantId, lineId, updated)
        _uiState.update { it.copy(editingLine = null, editingItem = null) }
    }
}
```

Como `menuItemsById` ya se carga de fondo (misma carta que usa la Carta,
cacheada por `MenuRepository`), `onEditLine` deja de necesitar una llamada
async: al pulsar el lápiz el `MenuItem` ya está disponible. Si el producto
se hubiera quitado de la carta entre que se cargó y que se pulsa editar,
`onEditLine` simplemente no hace nada (el lápiz tampoco se habría mostrado
en ese caso, salvo carrera muy improbable con el polling de la carta).

### 5. `CartScreen`: botón editar (solo si aplica) + configurador

- `CartLineCard` recibe un parámetro nuevo `onEdit: (() -> Unit)?` — `null`
  cuando la línea no es editable (`viewModel.isLineEditable(line)` es
  `false`), la lambda normal en caso contrario. Igual patrón que ya se usa en
  otros sitios de la app para condicionar un icono por disponibilidad.
- Dentro de `CartLineCard`, en la `Row` que hoy solo tiene
  `QuantityStepper` + el `IconButton` de `Delete`: si `onEdit != null`,
  añadir entre medias un `IconButton` con `Icons.Default.Edit` (nueva string
  `cart_edit_line`, "Editar producto", como `contentDescription`). Si
  `onEdit == null`, la fila queda exactamente como está hoy (solo `-`/`+` y
  eliminar) — sin hueco vacío ni icono deshabilitado, para no sugerir que
  "algo se puede editar y no se ve por qué".
- En `CartContent`/`items(lines)`, pasar
  `onEdit = if (viewModel.isLineEditable(line)) { { viewModel.onEditLine(line) } } else null`.
- En `CartScreen` (nivel superior), cuando `uiState.editingItem != null`,
  pintar `ProductConfiguratorSheet` (esto ya solo puede ocurrir para líneas
  editables, porque `onEditLine` es la única vía de llegar ahí):

```kotlin
uiState.editingItem?.let { item ->
    ProductConfiguratorSheet(
        item = item,
        initialConfig = ProductConfig.fromCartLine(item, uiState.editingLine!!),
        isEditing = true,
        onDismiss = viewModel::onEditDismiss,
        onAddToCart = viewModel::onEditConfirm,
    )
}
```

- Caso borde ya cubierto: si el producto deja de existir en la carta justo
  entre que se pinta la fila y se pulsa el lápiz (carrera con el polling de
  3 min de la carta), `onEditLine` no encuentra el `MenuItem` y no hace
  nada — no merece un Snackbar dedicado para un caso tan raro.

### 6. Strings nuevas (values / values-ca / values-en)

- `cart_edit_line`: "Editar producto" / catalán / inglés.
- `configurator_save_for`: "Guardar · %1$s" / catalán / inglés (mismo
  formato que `configurator_add_for`).

### 7. Tablet (`Expanded`)

`CartScreen` hoy no tiene panel lateral fijo (a diferencia de `MenuScreen`).
Para esta primera versión, el editor se abre siempre como bottom sheet
(`ProductConfiguratorSheet`) también en tablet — mismo patrón que ya usa
`MenuScreen` en `Compact`/`Medium`. Si se quiere consistencia total con el
panel lateral de `MenuScreen` en `Expanded`, sería una fase 2 separada (no
bloquea la funcionalidad pedida).

### 8. Verificación

- Tests unitarios nuevos: `ProductConfigTest` (round-trip `fromCartLine`),
  `CartRepositoryTest` (updateLine: sin colisión, con colisión/fusión, caso
  Grande→XL), `CartViewModelTest` (`isLineEditable` true/false según el
  `MenuItem` — con y sin modifierGroups/combo/platter removible —,
  onEditLine con item existente/ausente, onEditConfirm delega en el
  repositorio con el `lineId` correcto).
- Prueba manual: en el emulador/dispositivo, añadir Coca-Cola Grande y
  Coca-Cola XL como líneas separadas, editar la Grande a XL y comprobar que
  el carrito queda con una sola línea "Coca-Cola XL" x2 y el total
  recalculado es correcto.
- `./gradlew :app:testDebugUnitTest` antes de dar por cerrada la fase.

## Ficheros afectados

- `mobile/app/src/main/kotlin/com/mesaflow/client/feature/product/ProductConfig.kt`
- `mobile/app/src/main/kotlin/com/mesaflow/client/feature/product/ProductConfiguratorSheet.kt`
- `mobile/app/src/main/kotlin/com/mesaflow/client/core/data/CartRepository.kt`
- `mobile/app/src/main/kotlin/com/mesaflow/client/core/database/CartDao.kt`
- `mobile/app/src/main/kotlin/com/mesaflow/client/feature/cart/CartViewModel.kt`
- `mobile/app/src/main/kotlin/com/mesaflow/client/feature/cart/CartScreen.kt`
- `mobile/app/src/main/kotlin/com/mesaflow/client/core/model/Menu.kt` (mover `findItemById`)
- `mobile/app/src/main/res/values{,-ca,-en}/strings.xml`
- Tests: `CartRepositoryTest`, nuevo `ProductConfigTest`, `CartViewModelTest` (si no existe, crearlo)
