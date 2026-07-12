# Vista adaptable para tablet (app Android)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea a tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** La app cliente (`mobile/`) está pensada hoy para móvil en
vertical: listas a ancho completo, configurador de producto como bottom
sheet a pantalla completa, formularios estirados. En una tablet (o un móvil
en horizontal) eso deja mucho espacio vacío o contenido excesivamente
ancho. Este plan adapta las pantallas existentes a tablet usando
`WindowSizeClass`, sin crear pantallas nuevas ni cambiar la navegación de
fondo — mismo `MesaFlowNavigation`, misma lógica de ViewModels.

**Decisión de arquitectura (fijada):**

- **`androidx.compose.material3.windowsizeclass`** (o `androidx.window` si el
  proyecto prefiere la librería más nueva `WindowSizeClass` de
  `androidx.window.core.layout`) calculado una vez en `MainActivity` a
  partir de `calculateWindowSizeClass(activity)`, y pasado hacia abajo por
  parámetro/CompositionLocal — no se recalcula por pantalla.
- **Solo se adaptan pantallas existentes, no se crean pantallas nuevas.**
  El criterio por defecto es `WindowWidthSizeClass.Expanded` (tablet en
  cualquier orientación, o teléfono grande apaisado) vs `Compact`/`Medium`
  (móvil), usando el ancho porque es el que más cambia el layout útil aquí.
- **Patrón lista-detalle donde aplique** (carta + configurador de producto):
  en `Expanded` el configurador se muestra como panel lateral en vez de
  bottom sheet a pantalla completa; en `Compact`/`Medium` se mantiene el
  comportamiento actual sin cambios.
- **Contenido con ancho máximo en formularios largos** (Carrito, Cobro,
  Ajustes): en `Expanded` se centra el contenido con un ancho máximo
  cómodo de lectura en vez de estirarlo a todo el ancho de la tablet.

**Tech Stack:** Jetpack Compose + Material3 (`WindowSizeClass`).

## Restricciones globales

- No se cambia la navegación (`MesaFlowNavigation.kt`, `NavKeys.kt`) ni los
  ViewModels — es un cambio de capa de presentación (Composables), los
  `UiState` no necesitan campos nuevos salvo que un test lo requiera.
- El comportamiento actual en móvil (`Compact`/`Medium`) no debe cambiar
  visualmente: cualquier `if (windowSizeClass == Expanded)` debe dejar la
  rama `else` igual que el código de hoy.
- Ejecutar comandos desde `mobile/`.

---

## Fase 0 — Plumbing de WindowSizeClass

**Archivos:**
- Modificar: `mobile/app/build.gradle.kts` / `gradle/libs.versions.toml` —
  añadir la dependencia de `material3-window-size-class` si no está ya.
- Modificar: `MainActivity.kt` — calcular `calculateWindowSizeClass(this)`
  dentro de `setContent` y pasarlo a `MesaFlowNavigation`/pantallas.
- Nuevo (opcional): `core/designsystem/WindowSizeClass.kt` — un
  `CompositionLocal` si resulta más limpio que pasarlo por parámetro a
  través de varias pantallas de navegación.

**Tareas:**

- [x] **Paso 1:** **Desviación de diseño respecto al plan original**: no se
  añadió `material3-window-size-class` ni `androidx.window` — en vez de eso,
  `WindowWidthSizeClass` (enum propio con los mismos tres valores
  `Compact`/`Medium`/`Expanded`) se calcula a partir de
  `LocalConfiguration.current.screenWidthDp` con los mismos umbrales
  estándar que usan ambas librerías (600dp / 840dp). Evita añadir una
  dependencia nueva solo para esto y no depende de tener una `Activity` a
  mano en el punto de cálculo. Nuevo archivo:
  `core/designsystem/WindowSizeClass.kt` (`rememberWindowWidthSizeClass()` +
  `LocalWindowWidthSizeClass`, con valor por defecto `Compact` para que
  cualquier `@Preview`/test que no envuelva explícitamente el
  `CompositionLocal` se comporte como móvil, igual que hoy).
- [x] **Paso 2:** Calculado en `MainActivity.onCreate` (`setContent`) con
  `rememberWindowWidthSizeClass()` y propagado con
  `CompositionLocalProvider(LocalWindowWidthSizeClass provides ...)`
  envolviendo `MesaFlowTheme`/`MesaFlowNavigation` — **`CompositionLocal`**,
  tal y como recomendaba el plan, para no tocar `MesaFlowNavigation.kt` ni
  `NavKeys.kt` ni añadir un parámetro a cada pantalla.
- [x] **Paso 3 (parcial):** **Confirmado por el usuario**: `./gradlew build`
  en verde — compilación debug/release, tests unitarios y lint, todos en
  verde (con un arreglo suyo aparte: `app_name` marcado
  `translatable="false"` en `strings.xml`, ya que "MesaFlow" es marca y no
  debe traducirse — lint `MissingTranslation` lo exigía). Esto confirma que
  el plumbing no rompe nada, pero **no verifica todavía que el valor
  calculado cambie de verdad al rotar/usar un perfil de tablet** — eso se
  confirmará de forma natural en la Fase 3 (verificación manual en
  emulador), donde el cambio ya será visible en pantalla en vez de en un log.

**Fase 0 cerrada** (build en verde); la verificación visual en tablet queda para la Fase 3.

---

## Fase 1 — Carta + configurador: lista-detalle en tablet

**Archivos:**
- Modificar: `feature/menu/MenuScreen.kt` — en `Expanded`, el grid de
  productos ocupa una columna (p. ej. 60-65% del ancho) y el
  `ProductConfiguratorSheet` se pinta como panel fijo en la columna
  restante en vez de como `ModalBottomSheet` a pantalla completa; en
  `Compact`/`Medium` se mantiene el bottom sheet actual sin cambios.
- Modificar: `feature/product/ProductConfiguratorSheet.kt` — extraer el
  contenido interior (todo lo que no sea el propio `ModalBottomSheet`) a un
  Composable reutilizable para poder pintarlo tanto dentro del bottom sheet
  (móvil) como dentro del panel lateral (tablet), sin duplicar la UI del
  configurador.
- Modificar: el grid de categorías/productos para usar más columnas cuando
  hay más ancho disponible (`LazyVerticalGrid` con `columns` dependiente de
  `WindowSizeClass`).

**Tareas:**

- [x] **Paso 1:** Extraído `ProductConfiguratorContent` en
  `ProductConfiguratorSheet.kt` — todo el contenido interior (nombre,
  descripción, secciones de combo/modificadores/ingredientes quitables,
  barra de cantidad + botón añadir), sin `ModalBottomSheet` envolvente,
  recibiendo `config`/`onConfigChange` en vez de gestionar el estado
  internamente. `ProductConfiguratorSheet` (bottom sheet, sin cambios de
  comportamiento) y la nueva `ProductConfiguratorPanel` (panel lateral)
  gestionan su propio `ProductConfig` y delegan en este Composable.
- [x] **Paso 2:** `ProductConfiguratorPanel` (nuevo Composable, mismo
  archivo): mismo contenido que el bottom sheet dentro de un `Surface` con
  cabecera propia y botón de cerrar explícito (`Icons.Default.Close` — no
  hay gesto de "deslizar hacia abajo" como en el bottom sheet). En
  `MenuScreen`, el contenido principal se extrajo a `MenuBody` (cabecera,
  buscador, chips, lista) y ahora todo vive dentro de un `Row`: cuando
  `windowWidthSizeClass == Expanded` **y** hay `configuringItem`, `MenuBody`
  ocupa `weight(0.62f)` y `ProductConfiguratorPanel` `weight(0.38f)` con un
  `VerticalDivider` entre ambos; el `ModalBottomSheet` de siempre solo se
  pinta cuando **no** se cumple esa condición (Compact/Medium, o Expanded
  sin producto en configuración).
- [x] **Paso 3 — desviación de diseño respecto al plan original**: el grid
  de productos que describe el plan **no existe hoy**: `MenuList` es un
  `LazyColumn` de una sola columna (tarjetas a ancho completo agrupadas por
  sección), no un `LazyVerticalGrid`. Convertirlo a grid con columnas
  dependientes de `WindowSizeClass` sería un cambio de layout más invasivo
  de lo que cubre esta fase (agrupar por sección dentro de un grid requiere
  spans especiales) y con más riesgo sin poder compilar/ver el resultado yo
  mismo. Se dejó `MenuList` como lista de una columna también en
  `Expanded` — dentro de la columna izquierda al 62% de ancho, no ancho
  completo, así que ya no queda una tarjeta estirada a todo lo ancho de la
  tablet. Adaptar el grid de verdad queda pendiente si se quiere abordar
  aparte.
- [x] **Paso 4:** **Confirmado por el usuario**: `./gradlew build` en verde
  (debug/release, tests unitarios y lint). Las strings nuevas
  (`configurator_panel_title`/`configurator_panel_close`) ya tenían
  traducción en `en`/`ca` desde que se añadieron en la Fase 1, así que el
  lint de traducción no protestó — nada que arreglar.

**Fase 1 cerrada.**

---

## Fase 2 — Carrito, Cobro y Ajustes: ancho de contenido

**Archivos:**
- Modificar: `feature/cart/CartScreen.kt`, `feature/checkout/CheckoutScreen.kt`,
  `feature/settings/SettingsScreen.kt` — envolver el contenido principal en
  un `Column`/`Box` con `widthIn(max = 640.dp)` (o el valor que se decida)
  centrado horizontalmente cuando `windowSizeClass.widthSizeClass ==
  Expanded`; sin cambios en `Compact`/`Medium`.

**Tareas:**

- [x] **Paso 1:** `CartScreen` — el contenido de las tres ramas
  (`SubmittedContent`, `EmptyState`, `CartContent`) ahora vive dentro de un
  `Box(contentAlignment = Alignment.TopCenter)` con
  `Modifier.expandedContentMaxWidth(windowWidthSizeClass)` compartido, en vez
  de `Modifier.padding(innerPadding)` directo por rama.
- [x] **Paso 2:** `CheckoutScreen` — mismo patrón: `PaymentAcceptedContent` y
  `CheckoutContent` envueltos en el `Box` centrado con
  `expandedContentMaxWidth`, sustituyendo el `Modifier.padding(innerPadding)`
  anterior.
- [x] **Paso 3:** `SettingsScreen` — la `Column` con las secciones de
  ajustes usa `Modifier.expandedContentMaxWidth(windowWidthSizeClass)` en vez
  de `fillMaxWidth` implícito, dentro del mismo `Box` centrado.
- [x] **Paso 4:** El helper `Modifier.expandedContentMaxWidth` (nuevo, en
  `core/designsystem/WindowSizeClass.kt`) hace `fillMaxWidth()` en
  `Compact`/`Medium` — mismo comportamiento visual que antes del cambio; solo
  en `Expanded` acota a `640.dp` centrado. **Confirmado por el usuario**
  pendiente de re-ejecutar `./gradlew build` tras esta fase (ver nota de
  verificación abajo).

**Nota de verificación (2026-07-12):** al comprobar los archivos entregados
vía el bridge del dispositivo, una primera lectura de `WindowSizeClass.kt` a
través del punto de montaje Linux devolvió un archivo truncado (1992 de
2960 bytes, cortado a mitad de un comentario KDoc, sin la declaración de
`LocalWindowWidthSizeClass` ni la función `expandedContentMaxWidth`). Se
determinó que era una lectura obsoleta cacheada por el punto de montaje
(mismo problema ya visto con los `i18n/*.json`), no una escritura real
truncada: `device_list_dir` (que lee directamente el disco de Windows a
través de la app de escritorio, sin la capa de montaje Linux) confirmó los
4 archivos de esta fase con el tamaño exacto del origen local
(`WindowSizeClass.kt` 2960 B, `CartScreen.kt` 16068 B, `CheckoutScreen.kt`
21266 B, `SettingsScreen.kt` 8571 B). Se acepta `device_list_dir` como
verificación autoritativa cuando el punto de montaje Linux da lecturas
recién escritas inconsistentes.

**Fase 2 cerrada.** **Confirmado por el usuario:** `./gradlew build` en
verde (debug/release, tests unitarios y lint).

---

## Fase 3 — Tests y verificación

**Archivos:**
- Nuevo/Modificar: tests de Compose UI (`androidTest`) que verifiquen el
  layout lista-detalle en `Expanded` (p. ej. que el panel del configurador
  es visible sin necesidad de abrir un bottom sheet).
- Modificar: `docs/mobile-app.md` — sección corta sobre el soporte de
  tablet (qué pantallas se adaptan y con qué criterio de
  `WindowSizeClass`).

**Tareas:**

- [x] **Paso 1 — desviación de diseño respecto al plan original:** no se
  añadió un test de Compose UI automatizado para el layout lista-detalle en
  `Expanded`. Los tests instrumentados existentes (`AllergenFilterFlowTest`,
  `DemoToOrderFlowTest`, `PaymentFlowTest`) lanzan `MainActivity` real vía
  `createAndroidComposeRule<MainActivity>()` y corren contra el tamaño de
  pantalla real del emulador/dispositivo que los ejecuta — no hay en el
  proyecto ninguna infraestructura de `DeviceConfigurationOverride` (ni
  ningún otro mecanismo) para forzar `Expanded` sobre esa Activity ya
  lanzada. Añadirla habría requerido, o bien un host de test que instancie
  `MenuScreen` fuera de `MainActivity` con su `ViewModel` Hilt inyectado a
  mano (arriesgado sin poder compilar/ejecutar el resultado yo mismo), o
  bien tocar la infraestructura de tests existente de forma más invasiva de
  lo que cubre esta fase. Se deja documentado como trabajo futuro si se
  quiere cubrir con test automatizado; mientras tanto la verificación es
  manual (Paso 2).
- [ ] **Paso 2:** Verificación manual en un emulador de tablet (p. ej.
  "Pixel Tablet" API 34) y en un emulador de móvil, comparando que el
  comportamiento de móvil no cambió. **Pendiente de que el usuario la
  ejecute** — no es algo que se pueda verificar desde aquí.
- [x] **Paso 3:** Documentado en `docs/mobile-app.md` — nueva sección
  "Soporte de tablet (WindowSizeClass)": cálculo del tamaño de ventana,
  patrón lista-detalle de Carta+configurador, ancho máximo centrado en
  Carrito/Cobro/Ajustes, y la nota sobre la ausencia de test automatizado
  (Paso 1).
- [x] **Paso 4 (parcial):** **Confirmado por el usuario:** `./gradlew build`
  en verde tras la Fase 2 (incluye `test`, ver confirmación de Fase 2 arriba)
  — no se añadieron tests instrumentados nuevos en esta fase (Paso 1), así
  que no aplica `connectedAndroidTest` adicional.

**Fase 3 cerrada**, salvo el Paso 2 (verificación manual en emulador de
tablet), que queda pendiente de que el usuario la haga cuando pueda — no
bloquea el resto del plan, que se da por completo.
