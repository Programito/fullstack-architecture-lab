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

- [x] **Paso 1:** Añadir `nameI18n Json?` a las 6 entidades en `schema.prisma` + migración escrita a mano (`20260711120000_add_menu_name_i18n`, solo `ADD COLUMN` nullable, sin backfill). **Confirmado por el usuario**: migración aplicada (23 migraciones en total), `prisma migrate status` en verde.
- [x] **Paso 2:** Creado `NameI18nDto` compartido (`{ es?, ca?, en? }`, `dto/name-i18n.dto.ts`) y añadido como campo opcional en `CreateRestaurantProductDto`/`UpdateRestaurantProductDto`, `CreateMenuSectionDto`/`UpdateMenuSectionDto`, `CreateModifierGroupDto`/`UpdateModifierGroupDto` (grupo) y `CreateModifierOptionDto` (opción, anidada en el DTO de grupo).
- [x] **Paso 3 (parcial):** Actualizados los servicios/repositorios de **producto, sección de carta y grupo/opción de modificador** para persistir y devolver `nameI18n` sin tocar `name` (`prisma-restaurant-menu-admin.repository.ts`, `prisma-modifier-group.repository.ts`, sus puertos, use-cases y controladores; helper compartido `asNameI18n`/`toNameI18nJson` en `infrastructure/persistence/name-i18n.mapper.ts` para no duplicar la lógica de lectura/normalización entre repositorios). **Hueco de combo y componente de platter quedan fuera de este paso**: hoy no existe ningún endpoint admin para crearlos/editarlos (solo se seedan), así que no hay DTO/servicio de escritura donde enganchar su traducción todavía — es una decisión pendiente: ¿construir esa administración ahora (fuera del alcance original de este plan) o dejar sus traducciones para edición directa en seeds/BD por ahora?
- [x] **Paso 4:** Incluir `nameI18n` en la respuesta de `GET /restaurants/:id/menu` para producto, sección, modifierGroups/options, comboDefinition.slots y platterComponents — hecho en `restaurant-read.models.ts` (tipo `NameI18n`), `prisma-restaurant-read.repository.ts` (usa el mismo helper `asNameI18n`) y `restaurant-menu-response.dto.ts`.
- [x] **Paso 5:** **Confirmado por el usuario**: `pnpm test` en `backend/` — 76 archivos de test, 293 tests, todos en verde tras los cambios de escritura de producto/sección/grupo-opción de modificador. No se añadieron specs nuevas dedicadas a `nameI18n` todavía (cobertura pendiente si se quiere reforzar antes de construir sobre esto), pero no hay regresiones.

**Fase 1 (backend) cerrada** salvo la decisión pendiente sobre hueco de combo / componente de platter (ver Paso 3). Siguiente: Fase 2 (formularios ES/CA/EN en el admin web) o Fase 3 (app Android), o resolver antes esa decisión pendiente.

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
  - `menu-page` → diálogo de creación de sección: mismos dos campos opcionales. Solo cubre creación; **sigue sin existir un diálogo de edición de nombre de sección** (la única acción existente sobre una sección ya creada es `toggleSectionVisibility`), así que hoy no hay forma de editar `nameI18n` de una sección tras crearla — no se ha construido esa UI en esta fase.
  - `modifier-group-form-dialog`: campos ES/CA/EN añadidos tanto a nivel de grupo como por cada opción dinámica de la lista. **Hueco preexistente sin resolver**: este diálogo solo soporta creación — su `effect()` al abrir siempre resetea todos los campos a vacío y no hay ningún input de "grupo a editar", ni con este cambio ni antes de él. Es una limitación de arquitectura del componente anterior a esta feature; añadir edición/precarga sería un trabajo aparte.
  - Combo y platter: sin UI (no tienen admin de creación/edición, ver nota de Fase 1 Paso 3).
  - Copy en los tres idiomas añadido en `frontend/public/i18n/{es,en,ca}.json` bajo `menu.product.form.*` (reutilizado también por el diálogo de grupo de modificador) y `menu.page.*` para las nuevas etiquetas y placeholders. JSON validado con `json.load` en los tres archivos.
- [x] **Paso 4:** **Confirmado por el usuario**: `pnpm test`/`pnpm build` en `frontend/` en verde tras corregir los tests afectados por los campos `nameI18n` añadidos. No se han escrito specs nuevos dedicados a los campos ES/CA/EN en sí (cobertura pendiente si se quiere reforzar), pero no hay regresiones.

> **Nota de proceso:** en una iteración anterior de este documento se marcaron partes de la Fase 2 como completadas y "confirmadas", pero al verificar el código realmente presente en el equipo del usuario se comprobó que esos cambios de frontend nunca habían llegado a disco (quedaron solo en un directorio temporal de esta sesión). Se corrigió reescribiendo y re-verificando cada archivo contra el equipo, y esta vez el usuario ha confirmado test/build en verde sobre esos mismos archivos.

**Fase 2 cerrada** salvo: sin UI de edición de nombre de sección (solo creación) y sin precarga/edición en `modifier-group-form-dialog` (hueco preexistente del componente, anterior a esta feature). Siguiente: Fase 3 (app Android) o Fase 4 (docs y verificación), o cerrar antes esos dos huecos de UI si se prefiere.

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

## Apéndice — Auditoría de traducciones de la app (qué falta y qué cambia)

La parte de UI de la app ya está completa: strings es/en/ca, selector de idioma por-app, formato de moneda por locale, alérgenos traducidos y errores mapeados a `AppError` sin fugas técnicas (ver Fase 8 en `docs/plan-mobile-app-cliente.md`). Lo que falta es **contenido que hoy solo existe en castellano y viene del servidor**, y es exactamente lo que resuelve este plan:

- **Nombres y descripciones de la carta** (producto, sección) — cubierto por Fases 1–3 arriba.
- **Modificadores** (nombre de grupo, nombre de opción, "Sin X" como nombre de componente de platter marcado `removable`) — cubierto por Fases 1–3.
- **Re-resolución al cambiar de idioma** sin ir a red — cubierto por Fase 3, Paso 4.

Qué se queda igual a propósito (no son bugs, son decisiones ya tomadas):

- **Snapshots del pedido** (vista de cocina y POS) — se quedan en castellano siempre, sea cual sea el idioma del cliente que pidió: cocina y sala trabajan en un único idioma operativo.
- **Ticket del cliente** — ya sale en el idioma del comensal porque `CheckoutKey.linesJson` copia el nombre ya resuelto (en el idioma activo en ese momento) al añadir la línea al carrito, no relee del backend al mostrar el ticket (ver `docs/mobile-app.md` → *Pantalla de pago aceptado*). Con este plan, ese nombre copiado ya vendrá resuelto en el idioma correcto sin cambios adicionales en el ticket.

**Cambios concretos pendientes en la app**, en orden de impacto:

1. Mapper de carta (`core/data`/`core/model`): pasar de leer `name` a leer `resolveName(nameI18n, name, locale)` en los 5 puntos donde hoy se lee un nombre de dominio (producto, sección, grupo/opción de modificador, slot de combo, componente de platter).
2. Recalcular nombres visibles al cambiar idioma sin red (hoy el cambio de idioma solo afecta a los strings de la UI, no al contenido de la carta ya cargada).
3. Buscador: indexar/filtrar sobre el nombre resuelto, no sobre `name` crudo, para que buscar en inglés encuentre productos aunque `name` esté en castellano.
