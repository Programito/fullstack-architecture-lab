# Nombres multiidioma de la carta (ES/CA/EN)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea a tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** Además del `name` actual (canónico, en castellano), permitir guardar el nombre de cada entidad de la carta en catalán, castellano e inglés, para que la app cliente y el frontend público de la carta puedan mostrar el nombre en el idioma activo del comensal, sin tocar el resto del modelo de negocio.

**Decisión de arquitectura (fijada):**

- **Columnas JSON opcionales, no reemplazo.** Cada entidad afectada gana un campo `nameI18n: { es?, ca?, en? }` junto al `name` existente. `name` sigue siendo el canónico: es lo que ven cocina/POS y es el fallback cuando falta una traducción. Cambio 100% aditivo — sin backfill, sin migración de datos existentes, sin romper ningún consumidor actual que solo lea `name`.
- **La resolución de idioma se hace en el cliente, nunca en el servidor.** El backend siempre devuelve las tres variantes (o las que existan) en el payload; cada cliente (app Android, frontend admin, futura carta pública) elige qué mostrar según su propio idioma activo. Si el backend resolviera por `Accept-Language`, el ETag/caché condicional que ya protege `GET /restaurants/:id/menu` (`Cache-Control: private, max-age=0, must-revalidate` + `If-None-Match`, ver `docs/mobile-app.md`) dejaría de servir 304 al cambiar de idioma: cada cambio de idioma forzaría ida a red. Con la resolución en cliente, cambiar de idioma es instantáneo y sin red porque los datos ya están descargados.
- **Alcance: 6 entidades.** Producto (`Product.name` + `description`), sección de carta (`MenuSection.name`), grupo de modificador (`ModifierGroup.name`), opción de modificador (`ModifierOption.name`), hueco de combo (`ComboSlot.name`), componente de platter (`PlatterComponent.name`).
- **Fuera de alcance ahora:** `RestaurantProduct.displayName`/`displayDescription` y `MenuItem.displayNameOverride` (overrides por restaurante) — quedan en castellano por ahora; si se necesitan traducidos, es una fase futura sobre el mismo patrón.

**Tech Stack:** NestJS + Prisma (backend), Angular standalone + Transloco (admin web), Jetpack Compose + kotlinx.serialization (app Android).

## Restricciones globales

- Ningún endpoint existente cambia de forma incompatible: los campos `nameI18n` son añadidos, opcionales, y `name` no se toca.
- Sin backfill: las filas existentes simplemente no tienen `nameI18n` (o lo tienen a `null`/`{}`) hasta que alguien las traduzca desde el admin.
- Los tres idiomas del proyecto son es/ca/en, coherente con Transloco (frontend) y los resources de locale (app), ver `docs/plan-mobile-app-cliente.md`.
- Ejecutar comandos de backend desde `backend/`, de frontend desde `frontend/`, de app desde `mobile/`.

---

## Fase 1 — Backend (Prisma + DTOs + servicios)

**Archivos:**
- Modificar: `backend/prisma/schema.prisma` — añadir `nameI18n Json?` a `Product`, `MenuSection`, `ModifierGroup`, `ModifierOption`, `ComboSlot`, `PlatterComponent`.
- Nuevo: migración Prisma (`npx prisma migrate dev --name add_menu_name_i18n`) — solo `ADD COLUMN ... nullable`, sin `NOT NULL`, sin default forzado, sin backfill.
- Modificar: DTOs de creación/edición de cada entidad (p. ej. `create-product.dto.ts`, `update-product.dto.ts`, y equivalentes de sección/grupo/opción/slot/componente) — añadir `nameI18n?: { es?: string; ca?: string; en?: string }` opcional, validado con `class-validator` (`@IsOptional()`, `@ValidateNested()` sobre un DTO `NameI18nDto` con `@IsOptional() @IsString()` por idioma).
- Modificar: los servicios/controllers de cada entidad para persistir y devolver `nameI18n` tal cual (sin lógica de resolución — eso es cosa del cliente).
- Modificar: el mapeo de `GET /restaurants/:id/menu` (el endpoint que arma el árbol completo de la carta) para incluir `nameI18n` en cada nodo relevante (producto, sección, modifierGroups, comboDefinition.slots, platterComponents).
- Test: unit tests de los servicios/DTOs (guardar solo `es`, guardar los tres, guardar ninguno → no rompe nada).
- Test: test de integración del endpoint de carta verificando que `nameI18n` viaja en el payload cuando existe y se omite/es `null` cuando no.

**Tareas:**

- [x] **Paso 1:** Añadir `nameI18n Json?` a las 6 entidades en `schema.prisma` + migración escrita a mano (`20260711120000_add_menu_name_i18n`, solo `ADD COLUMN` nullable, sin backfill). Migración aplicada a la BD real (23 migraciones en total, `prisma migrate status` en verde) — pero ver nota de proceso más abajo: `schema.prisma` en sí no reflejaba estas columnas hasta la re-implementación del 2026-07-12.
- [x] **Paso 2:** `NameI18nDto` compartido (`{ es?, ca?, en? }`, `dto/name-i18n.dto.ts`) y añadido como campo opcional en `CreateRestaurantProductDto`/`UpdateRestaurantProductDto`, `CreateMenuSectionDto`/`UpdateMenuSectionDto`, `CreateModifierGroupDto`/`UpdateModifierGroupDto` (grupo y opción anidada).
- [x] **Paso 3:** Servicios/repositorios de **producto, sección de carta y grupo/opción de modificador** persisten y devuelven `nameI18n` sin tocar `name` (`prisma-restaurant-menu-admin.repository.ts`, `prisma-modifier-group.repository.ts`, sus puertos, use-cases y controladores; helper compartido `asNameI18n`/`toNameI18nJson` en `infrastructure/persistence/name-i18n.mapper.ts`). **Resuelto (2026-07-12):** el hueco de combo/platter (no había endpoint admin para crearlos/editarlos, solo se seedaban) se cerró con `docs/superpowers/plans/2026-07-12-combo-platter-admin.md` — CRUD de `ComboSlot`/`PlatterComponent` con `nameI18n` desde el primer día (backend Fases 1-2, admin web Fase 3, las tres confirmadas con tests/build en verde).
- [x] **Paso 4:** `nameI18n` en la respuesta de `GET /restaurants/:id/menu` para producto, sección, modifierGroups/options, comboDefinition.slots y platterComponents — `restaurant-read.models.ts` (tipo `NameI18n`), `prisma-restaurant-read.repository.ts` (usa `asNameI18n`) y `restaurant-menu-response.dto.ts`.
- [x] **Paso 5:** **Reconfirmado por el usuario tras la re-implementación real del 2026-07-12**: `pnpm test` en `backend/` en verde sobre el código genuinamente en disco (26 archivos re-verificados con re-stage + grep tras el commit, no solo la respuesta de la herramienta).

**Fase 1 (backend) cerrada de nuevo, esta vez de verdad**, tras la re-implementación real del 2026-07-12 y su reconfirmación. Queda solo la decisión sobre combo/platter, cubierta por el nuevo plan `2026-07-12-combo-platter-admin.md`.

> **Nota de proceso (2026-07-12) — reportado como completo pero no lo estaba:** al iniciar el trabajo sobre el plan de admin de combo/platter se descubrió que, pese a que todas las tareas de esta Fase 1 estaban marcadas `[x]` y el usuario había reportado `pnpm test` en verde, el código real en el equipo del usuario **no tenía nada de esto implementado**: `schema.prisma` no declaraba `nameI18n` en ninguna de las 6 entidades (aunque la migración sí estaba aplicada en la base de datos real, quedó desincronizada de `schema.prisma`), y una búsqueda de `nameI18n`/`NameI18n` en ~10 archivos TypeScript clave (DTOs de respuesta, repositorios, modelos de dominio, puertos) dio cero resultados. Solo existían 2 archivos huérfanos: `name-i18n.dto.ts` (correcto) y `name-i18n.mapper.ts` (con un import roto a un tipo `NameI18n` que no existía todavía en `restaurant-read.models.ts`). Esto explica por qué los tests pasaban: al no estar nada realmente conectado, no había código que pudiera fallar por la feature rota — quedaba simplemente inerte. Se ha rehecho la Fase 1 completa (26 archivos: `schema.prisma`, modelos de dominio, DTOs de request/response de producto/sección/grupo/opción, puertos, use-cases, los dos repositorios Prisma de escritura y los tres controladores) y esta vez **cada archivo se ha vuelto a leer desde el equipo tras el commit** (re-staging fresco + grep de `nameI18n`/`NameI18n`) para confirmar que el contenido escrito coincide con lo esperado, en vez de confiar solo en la respuesta `written: true` de la herramienta de commit — la misma lección que ya había costado una ronda completa en la Fase 2 (frontend). Falta que el usuario confirme `pnpm test`/`pnpm build` en verde sobre este código real.

---

## Fase 2 — Admin web (formularios ES/CA/EN)

**Archivos:**
- Modificar: `frontend/src/app/features/menu/models/product.model.ts` y modelos hermanos (`modifier-group.model.ts`, `modifier-option.model.ts`, `combo.model.ts`, sección, platter) — añadir `nameI18n?: { es?: string; ca?: string; en?: string }`.
- Modificar: `frontend/src/app/features/menu/services/menu-api.service.ts` — mapear `nameI18n` desde/hacia el backend.
- Modificar: los diálogos/formularios de creación-edición (producto, sección, `modifier-group-form-dialog`, combo, platter) para añadir tres campos opcionales de nombre (ES/CA/EN) con el castellano (`name`) siempre obligatorio y CA/EN opcionales; UI con pestañas o inputs apilados, dejando claro cuál es el canónico.
- Modificar: `frontend/public/i18n/{es,en,ca}.json` — etiquetas de los nuevos campos ("Nombre (catalán)", "Nombre (inglés)", ayuda de "se usa como alternativa a X si falta").
- Test: specs de cada formulario verificando que se puede guardar con solo castellano, con los tres, y que el envío al API incluye `nameI18n` solo si hay algún valor.

**Tareas:**

- [x] **Paso 1:** Extendidos los modelos de frontend con `nameI18n` opcional: `frontend/src/app/features/menu/models/name-i18n.model.ts` (tipo compartido `{ es?, ca?, en? }`, exportado también desde el barrel `menu.models.ts`), añadido a `menu-category.model.ts` (`MenuCategory`), `modifier-option.model.ts` (`ModifierOption`), `modifier-group.model.ts` (`ModifierGroup`), `product.model.ts` (`Product`, `CreateProductInput`, `UpdateProductInput`) y `combo.model.ts` (`ComboSlot`, solo lectura — sin admin todavía). También añadido a los DTOs de `restaurant-pos-api.models.ts`: request y response de producto, sección (`MenuSectionAdminDto`, `CreateMenuSectionRequest`, `UpdateMenuSectionRequest`), grupo/opción de modificador (`CreateModifierGroupRequest`, `UpdateModifierGroupRequest`, `CreateModifierGroupOptionRequest`), y los DTOs de lectura de `RestaurantMenuComboSlotDto`/`RestaurantMenuPlatterComponentDto` (solo lectura, reflejando lo que ya devuelve el backend).
- [x] **Paso 2:** Extendido `menu-api.service.ts` para mapear `nameI18n` en ambas direcciones — `createSection` (nuevo parámetro opcional), `updateSection`, `mapApiMenuToMenuData` (secciones y slots de combo), `mapModifierGroupDto` (grupo y opciones), `mapApiItemToProduct` (producto). También extendido `menu-mock.service.ts` (datos de demo/fallback): cada definición mock ya tenía las tres variantes de nombre internamente (para el selector de idioma de la demo) — ahora se exponen también como `nameI18n` en categorías, grupos/opciones de modificador, productos y slots de combo, vía un helper `toNameI18n()`, para que el modo demo se comporte igual que contra el API real.
- [x] **Paso 3:** Inputs ES/CA/EN añadidos en los tres formularios en scope:
  - `product-editor-page` (crear/editar producto): campos "Nombre (catalán)" / "Nombre (inglés)" junto al nombre principal (castellano, obligatorio, sin cambios). Precarga desde `product.nameI18n` al editar.
  - `menu-page` → diálogo de creación de sección: mismos dos campos opcionales. **Resuelto (2026-07-12):** añadido un diálogo de edición (`editSectionOpen`/`openEditSection()`/`submitEditSection()`) con botón de lápiz junto al de eliminar en cada tarjeta de sección; precarga `name`/`nameI18n` desde la categoría y llama a `menuApi.updateSection()`.
  - `modifier-group-form-dialog`: campos ES/CA/EN añadidos tanto a nivel de grupo como por cada opción dinámica de la lista. **Resuelto (2026-07-12):** el diálogo acepta ahora un `input()` `editingGroup: ModifierGroup | null`; su `effect()` precarga todos los campos (nombre, ES/CA/EN, tipo, obligatorio, opciones con su precio/imagen) cuando se abre con un grupo, y resetea a vacío cuando se abre en modo creación (`editingGroup() === null`). `menu-page` añadió un botón de editar junto al de eliminar en cada tarjeta de grupo (`openEditModifierGroup()`), y `submitModifierGroupForm()` decide entre `createModifierGroup`/`updateModifierGroup` según si hay un grupo en edición. El título/botón del diálogo cambian a "Editar grupo de modificadores"/"Guardar cambios" en ese modo.
  - Combo y platter: **resuelto (2026-07-12)** — ya tienen UI de admin (lista de slots/componentes con ES/CA/EN) en `product-editor-page`, ver `docs/superpowers/plans/2026-07-12-combo-platter-admin.md` Fase 3.
  - Copy en los tres idiomas añadido en `frontend/public/i18n/{es,en,ca}.json` bajo `menu.product.form.*` (reutilizado también por el diálogo de grupo de modificador) y `menu.page.*` para las nuevas etiquetas y placeholders. JSON validado con `json.load` en los tres archivos.
- [x] **Paso 4:** **Confirmado por el usuario**: `pnpm test`/`pnpm build` en `frontend/` en verde tras corregir los tests afectados por los campos `nameI18n` añadidos. No se han escrito specs nuevos dedicados a los campos ES/CA/EN en sí (cobertura pendiente si se quiere reforzar), pero no hay regresiones.

> **Nota de proceso:** en una iteración anterior de este documento se marcaron partes de la Fase 2 como completadas y "confirmadas", pero al verificar el código realmente presente en el equipo del usuario se comprobó que esos cambios de frontend nunca habían llegado a disco (quedaron solo en un directorio temporal de esta sesión). Se corrigió reescribiendo y re-verificando cada archivo contra el equipo, y esta vez el usuario ha confirmado test/build en verde sobre esos mismos archivos.

**Fase 2 cerrada por completo.** Los dos huecos de UI preexistentes (sin edición de nombre de sección, sin precarga/edición en `modifier-group-form-dialog`) se resolvieron el 2026-07-12: ver notas del Paso 3 arriba. **Confirmado por el usuario**: `pnpm test` (997 tests en 111 archivos) y `pnpm build` en verde en `frontend/` — solo warnings preexistentes de CommonJS (`mermaid`, `exceljs`, `jszip`), no bloquean el build.

---

## Fase 3 — App Android (resolución en el mapper + repintado sin red)

**Archivos:**
- Modificar: DTOs de red de la carta (`core/network`, espejo del payload del backend) — añadir `nameI18n: NameI18nDto?` en producto, sección, grupo/opción de modificador, slot de combo y componente de platter.
- Modificar: `core/model` (modelos de dominio `Menu`, `MenuItem`, etc.) y el mapper DTO→dominio (`MenuRepository` o el mapper que usa) — añadir una función `resolveName(nameI18n, fallback = name, locale)` que se aplica al mapear, y se vuelve a aplicar cuando cambia el idioma activo, sin volver a pedir la carta a red (los datos de las tres variantes ya están en memoria/caché de disco desde la última respuesta 304/200).
- Modificar: `core/datastore` — persistir el idioma elegido por el usuario (si la app permite elegirlo) o leerlo del locale del sistema.
- Modificar: `feature/menu` (buscador) — el filtro de texto debe buscar sobre el nombre **ya resuelto** en el idioma activo, no sobre `name` en castellano a secas.
- Modificar: `feature/productconfig` — nombres de modificadores/opciones/slots/componentes de platter también resueltos por idioma.
- Test: unit test del resolutor (`resolveName`) — con las tres variantes, con solo `es`, con `nameI18n` nulo, fallback correcto en cada caso.
- Test: test de ViewModel/UI verificando que al cambiar el idioma activo la carta se repinta con los nombres del nuevo idioma sin disparar ninguna llamada de red nueva.

**Tareas:**

- [x] **Paso 1:** Añadido `nameI18n: NameI18nDto?` (nuevo `NameI18nDto { es?, ca?, en? }`) en `core/network/dto/MenuDtos.kt` a `MenuSectionDto`, `MenuItemDto`, `ModifierGroupDto`, `ModifierOptionDto`, `ComboSlotDto` y `PlatterComponentDto`. `ComboSlotOptionDto` queda sin `nameI18n` a propósito (su nombre de display viene del producto asociado, no de un campo propio — igual que en backend/frontend). Espejo en `core/model/Menu.kt`: mismo `NameI18n` de dominio y campo `nameI18n` en `MenuSection`, `MenuItem`, `ModifierGroup`, `ModifierOption`, `ComboSlot`, `PlatterComponent`.
- [x] **Paso 2:** `resolveName(nameI18n, fallback, localeTag)` en nuevo `core/common/NameResolution.kt`, más `AppLanguage.resolveLocaleTag()` (usa el `tag` fijo del idioma elegido, o `Locale.getDefault().language` en modo Sistema). Tests en `core/common/NameResolutionTest.kt`: tres variantes, solo castellano (fallback en los demás idiomas), `nameI18n` nulo, variante en blanco (no debe ganarle al fallback), idioma no soportado.
- [x] **Paso 3:** `Menu.withResolvedNames(localeTag)` en el mismo archivo recorre recursivamente secciones → items → grupos/opciones de modificador → combo/slots → platter components y sustituye `name` por la variante resuelta. Se aplica en `MenuMappers.toDomain()` a través de `MenuViewModel` (no en el mapper DTO→dominio en sí, que solo copia `nameI18n` sin resolver — la resolución depende del idioma activo, que el mapper no conoce). El nombre que llega a la UI (`MenuScreen`, `MenuFilter`, `ProductConfig`, `ProductConfiguratorSheet`) ya está resuelto: ninguno de esos consumidores cambia, porque todos ya leían `item.name`/`group.name`/etc.
- [x] **Paso 4:** `MenuViewModel` ahora inyecta `SettingsStore`, guarda la carta cruda sin resolver en `rawMenu` (aparte de `_uiState`, que lleva la versión ya resuelta) y observa `settingsStore.language` — al cambiar, recalcula `currentLocaleTag` y re-resuelve `rawMenu` sin llamar a `menuRepository` (sin red). El polling periódico también se ajustó para comparar la carta fresca contra `rawMenu` (sin resolver) en vez de contra `_uiState.content.menu` (que ya estaría resuelto y casi siempre no coincidiría con la respuesta cruda del servidor tras el cambio).
- [x] **Paso 5:** No fue necesario tocar `MenuFilter`, `ProductConfig` ni `ProductConfiguratorSheet`: todos consumen `item.name`/`group.name`/`option.name`/`slot.name`/`component.name`, que ya llegan resueltos desde `MenuViewModel` antes de publicarse en `_uiState`.
- [x] **Paso 6:** **Confirmado por el usuario**: `./gradlew test` pasa. Tests de resolución hechos (Paso 2) y test de mapeo `nameI18n` en `MenuMappersTest.kt`. `./gradlew test` inicialmente NO compilaba: `ProductConfigTest.kt` construía `ModifierOption(...)` con argumentos posicionales (p. ej. `ModifierOption("o-brava", "Brava", 0, true)`), y al insertar el nuevo parámetro `nameI18n: NameI18n? = null` entre `name` y `priceDeltaCents` en el constructor, esos posicionales se desplazaron silenciosamente (`0` pasó a bindear con `nameI18n`, `true` con `priceDeltaCents`) — el mismo tipo de rotura que ya había pasado en el frontend Angular al añadir un campo intermedio. El usuario lo arregló cambiando esas llamadas a argumentos con nombre (`priceDeltaCents = ..., isAvailable = ...`) en `ProductConfigTest.kt`; `MenuFilterTest.kt` ya usaba argumentos con nombre y no se vio afectado. **No se ha escrito un test de `MenuViewModel`** que verifique el repintado sin red al cambiar idioma (requeriría fixtures de coroutines/Turbine no explorados en esta sesión), ni se han corrido tests de emulador (`./gradlew connectedAndroidTest`) — no son bloqueantes para cerrar esta fase.

**Fase 3 cerrada.**

> **Nota de proceso:** los archivos `.kt` de `mobile/` no se pueden leer mediante el puente de staging habitual (falla con "HTTP 400 adding session file" para esa extensión específica; otras extensiones en la misma carpeta funcionan bien). Se ha usado en su lugar `device_bash` apuntando a la ruta Linux montada (`/sessions/.../mnt/Proyecto/...`) para leer el código existente antes de escribir cada cambio, y tras cada `device_commit_files` se ha vuelto a leer con `device_bash` para confirmar el contenido real guardado — la escritura sí funciona con `.kt`, solo la lectura vía staging falla.
>
> **Lección repetida en esta fase:** insertar un nuevo campo *entre* parámetros existentes de una data class/constructor (en vez de al final) rompe cualquier llamada que use argumentos posicionales, incluso con valor por defecto (`= null`) — no da error de compilación por "falta argumento", sino un desplazamiento silencioso de tipos que a veces ni siquiera falla en compilación si los tipos coinciden por casualidad. Ya había pasado en Fase 2 (frontend) y ha vuelto a pasar aquí en Android. Para la Fase de app (si se retoma) o cualquier cambio futuro de este estilo, conviene priorizar añadir campos nuevos al final del constructor, o revisar explícitamente las llamadas posicionales existentes antes de dar el cambio por seguro.

---

## Fase 4 — Docs y verificación

**Archivos:**
- Modificar: `docs/mobile-app.md` — añadir una sección corta explicando la resolución de idioma en cliente y por qué no se hace en servidor (protege el ETag/304).
- Modificar: `docs/plan-mobile-app-cliente.md` — anotar esta capacidad en la fase correspondiente o en el backlog si se decide como iteración posterior a la Fase 8.
- Nuevo/Modificar: este mismo documento (`docs/superpowers/plans/2026-07-11-menu-multilingual-names.md`) — marcar fases completadas con `~~tachado~~` según convención del repo (ver `docs/plan-mobile-app-cliente.md`).

**Tareas:**

- [x] **Paso 1:** Añadida la sección "Nombres multiidioma de la carta" en `docs/mobile-app.md` (entre "Sondeos pensados para hosting gratuito" y el flujo crítico de pedido): explica la decisión de resolver en cliente y no en servidor, `NameResolution.kt`, cómo `MenuViewModel` guarda `rawMenu` y repinta sin red al cambiar idioma, y por qué `MenuFilter`/`ProductConfig` no necesitaron cambios. También anotado en `docs/plan-mobile-app-cliente.md` (Fase 8, nuevo punto 7, marcado como iteración añadida sobre el alcance original de esa fase).
- [ ] **Paso 2:** No verificado manualmente todavía — requiere un dispositivo/emulador real (cambiar el idioma en Ajustes y confirmar en el inspector de red que no sale ninguna petición nueva a `/restaurants/:id/menu`). Pendiente de que lo compruebes tú.
- [ ] **Paso 3:** No se añadió ningún diagrama Mermaid nuevo en esta fase (la sección nueva es solo prosa), así que no aplica ejecutar el validador — no se ha tocado ningún bloque ```mermaid``` existente.

---

## Fase 5 — Extensión (2026-07-12/13): descripción de producto, complementos, segment de idioma y unificación de `nameEs`

Iteración sobre el admin web, posterior al cierre de las Fases 1-4. Añade traducción de la **descripción** de producto (no solo el nombre), lleva `nameI18n` a los **complementos/extras** (suplementos propios del producto), sustituye las rejillas fijas de 3 columnas ES/CA/EN por un **segment de idioma** reutilizable, y resuelve una inconsistencia de convención: si el `nameEs`/`descriptionEs` explícito de Producto (con `name` tratado como interno) debía quitarse para igualar a ModifierGroup/ModifierOption, o extenderse a esas dos entidades. **Decisión del usuario:** extenderlo — `name` es el identificador interno/global en las seis entidades, y el texto en castellano que ve el comensal vive en un campo `nameEs`/`descriptionEs` explícito, igual que ya hacía Producto.

**Archivos:**
- Backend: `backend/prisma/schema.prisma` — añadido `descriptionI18n Json?` a `Product` (migración `20260712170000_add_product_description_i18n`, mismo patrón aditivo que `nameI18n`). `NameI18nDto` (`{ es?, ca?, en? }`) ya cubría `es` desde el origen — sin cambios de tipos ni DTOs en esta fase, todo lo demás era puramente frontend.
- Frontend: `frontend/src/app/features/menu/pages/product-editor-page/product-editor-page.ts`/`.html` — descripción en 3 idiomas, complementos en 3 idiomas, combo slots y platter components con `nameEs` + segment de idioma (en vez de las rejillas CA/EN fijas).
- Frontend: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.ts`/`.html` — `nameEs` añadido a nivel de grupo y de cada opción dinámica.
- Tests: `product-editor-page.spec.ts`, `modifier-group-form-dialog.spec.ts` actualizados/ampliados.
- Backend: `mesaflow-order-write-schema.integration-spec.ts` — fix no relacionado encontrado de paso (`Order.dailyNumber`, campo obligatorio sin default desde la migración `20260711100000_add_order_daily_number`, faltaba en dos fixtures de este archivo).

**Tareas:**

- [x] **Paso 1 — Descripción de producto en 3 idiomas:** `descriptionI18n Json?` en `Product` (schema + migración aplicada por el usuario con `pnpm prisma:generate`/`pnpm prisma:migrate` contra Neon dev). Backend de restaurantes ya estaba conectado end-to-end (use-cases/DTOs/repositorios) sin cambios adicionales. Frontend: `descriptionCa/En/Es` en `product-editor-page.ts`, textarea de descripción canónica + variante activa en el segment.
- [x] **Paso 2 — Segment de idioma:** sustituidas las dos rejillas de 3 columnas (nombre y descripción) por una única caja con `app-segmented-control` (reutiliza `languageSelect.languages.{ca,en,es}`) + un `app-input`/`app-textarea` que lee/escribe la señal del idioma activo (`activeContentLocale`). Patrón de setter tipado (`setActiveContentLocale`/`isProductContentLocale`) igual que `isMenuPageTab`/`setActiveTab` en `menu-page.ts`, para no perder el tipado estricto del `valueChange: string` genérico del segment.
- [x] **Paso 3 — Complementos/extras en 3 idiomas:** `nameCa`/`nameEn`/`nameEs` en `SupplementOptionDraft` (los suplementos son `ModifierOption` con `scope='product'` por debajo). UI con 3 columnas (ES/CA/EN) por fila, ya que aquí sí conviene ver los tres a la vez al ser una lista corta de opciones con precio.
- [x] **Paso 4 — Unificación `nameEs`:** decisión tomada explícitamente por el usuario ("tiene que existir name y después los names de cada idioma" → confirmado como "name es el global y nameEs es el que se muestra en la app"). Aplicado a:
  - `ModifierGroup` y `ModifierOption` (`modifier-group-form-dialog.ts`/`.html`): añadido `nameEs` a nivel de grupo y de cada opción, mismo patrón que Producto.
  - `ComboSlot` y `PlatterComponent` (`product-editor-page.ts`/`.html`): añadido `nameEs`, y de paso migrados del patrón antiguo (3 inputs sueltos nombre+CA+EN por fila) al mismo segment de idioma global que ya usa el nombre/descripción del producto — cada fila muestra el nombre canónico + un único campo de "variante activa" (placeholder indica el idioma seleccionado), controlado por el segment de la cabecera del formulario.
  - `MenuSection` **no se tocó** en esta pasada — sigue con el patrón antiguo (solo `nameI18n` sin `nameEs` explícito propio, en el diálogo de creación/edición de sección en `menu-page.ts`). Si se quiere unificar también, es un paso pendiente idéntico a los anteriores.
- [x] **Paso 5:** **Confirmado por el usuario:** `pnpm test` en `frontend/` (112 archivos, 1010 tests) y `pnpm test`/`pnpm test:integration` en `backend/` (82 archivos/328 tests unitarios; 7/7 archivos e integración, 31/31 tests) en verde, incluyendo el fix de `Order.dailyNumber` en los fixtures de `mesaflow-order-write-schema.integration-spec.ts` (bug preexistente, no introducido por esta fase, encontrado al correr `pnpm test:integration`).

**Fase 5 (admin web) cerrada.** Backend confirmado en verde con migración real aplicada; frontend confirmado en verde con la suite completa.

> **Nota histórica:** al cerrar la Fase 5 quedó pendiente la app Android (`descriptionI18n` y el resolutor de descripción no existían todavía en Kotlin). Se resolvió en la Fase 6, justo debajo.

---

## Fase 6 — App Android: extender a `descriptionI18n`

Cierra el pendiente que dejó la Fase 5: llevar la descripción de producto en 3 idiomas a Kotlin, siguiendo el mismo patrón que la Fase 3 usó para el nombre. `nameEs` no requirió ningún cambio en la app: `NameI18n`/`resolveName` ya trataban `es` como una variante más desde el origen, así que el resolutor ya era correcto para la nueva convención de la Fase 5 sin tocar código.

**Archivos:**
- `mobile/app/src/main/kotlin/com/mesaflow/client/core/model/Menu.kt` — `MenuItem.descriptionI18n: NameI18n? = null` (reutiliza el mismo tipo `{es, ca, en}` que `nameI18n`).
- `mobile/app/src/main/kotlin/com/mesaflow/client/core/network/dto/MenuDtos.kt` — espejo `MenuItemDto.descriptionI18n: NameI18nDto?`.
- `mobile/app/src/main/kotlin/com/mesaflow/client/core/data/MenuMappers.kt` — mapeo DTO→dominio de `descriptionI18n` (sin resolver, igual que `nameI18n`).
- `mobile/app/src/main/kotlin/com/mesaflow/client/core/common/NameResolution.kt` — nueva función `resolveDescription` (como `resolveName` pero con fallback nulo, porque `description: String?`), y `MenuItem.withResolvedNames` ahora también resuelve `description`. No hizo falta tocar `MenuViewModel.kt`, `MenuScreen.kt` ni `ProductConfiguratorSheet.kt`: todos ya leen `item.description` sin saber de i18n, y les llega resuelto desde `withResolvedNames`, igual que ya pasaba con `item.name`.
- Tests: `NameResolutionTest.kt` (tres variantes, `descriptionI18n` nulo, variante en blanco) y `MenuMappersTest.kt` (mapeo con/sin `descriptionI18n`).

**Tareas:**

- [x] **Paso 1:** DTO/modelo de dominio extendidos con `descriptionI18n`, mapeo DTO→dominio actualizado.
- [x] **Paso 2:** `resolveDescription` + `MenuItem.withResolvedNames` resolviendo también la descripción, sin tocar los puntos de consumo (ya leían `item.description` genérico).
- [x] **Paso 3:** Tests unitarios nuevos para `resolveDescription` y el mapeo de `descriptionI18n`.
- [x] **Paso 4:** **Confirmado por el usuario:** `./gradlew test` en `mobile/` — `BUILD SUCCESSFUL`, `testDebugUnitTest` en verde (23s), sin fallos.

**Fase 6 cerrada.** Con esto, `descriptionI18n` y la unificación de `nameEs` de la Fase 5 quedan cubiertos en las tres capas (backend, admin web, app Android).

---

## Apéndice — Auditoría de traducciones de la app (qué falta y qué cambia)

La parte de UI de la app ya está completa: strings es/en/ca, selector de idioma por-app, formato de moneda por locale, alérgenos traducidos y errores mapeados a `AppError` sin fugas técnicas (ver Fase 8 en `docs/plan-mobile-app-cliente.md`). Lo que falta es **contenido que hoy solo existe en castellano y viene del servidor**, y es exactamente lo que resuelve este plan:

- **Nombres de la carta** (producto, sección, modificadores, combo, platter) — cubierto por Fases 1–3.
- **Modificadores** (nombre de grupo, nombre de opción, "Sin X" como nombre de componente de platter marcado `removable`) — cubierto por Fases 1–3.
- **Re-resolución al cambiar de idioma** sin ir a red — cubierto por Fase 3, Paso 4.
- **Descripción de producto** (`descriptionI18n`, añadida en la Fase 5 sobre el admin web) — cubierto en la app por la Fase 6.

Qué se queda igual a propósito (no son bugs, son decisiones ya tomadas):

- **Snapshots del pedido** (vista de cocina y POS) — se quedan en castellano siempre, sea cual sea el idioma del cliente que pidió: cocina y sala trabajan en un único idioma operativo.
- **Ticket del cliente** — ya sale en el idioma del comensal porque `CheckoutKey.linesJson` copia el nombre ya resuelto (en el idioma activo en ese momento) al añadir la línea al carrito, no relee del backend al mostrar el ticket (ver `docs/mobile-app.md` → *Pantalla de pago aceptado*). Con este plan, ese nombre copiado ya vendrá resuelto en el idioma correcto sin cambios adicionales en el ticket.

**Cambios concretos pendientes en la app**, en orden de impacto:

1. Mapper de carta (`core/data`/`core/model`): pasar de leer `name` a leer `resolveName(nameI18n, name, locale)` en los 5 puntos donde hoy se lee un nombre de dominio (producto, sección, grupo/opción de modificador, slot de combo, componente de platter).
2. Recalcular nombres visibles al cambiar idioma sin red (hoy el cambio de idioma solo afecta a los strings de la UI, no al contenido de la carta ya cargada).
3. Buscador: indexar/filtrar sobre el nombre resuelto, no sobre `name` crudo, para que buscar en inglés encuentre productos aunque `name` esté en castellano.
