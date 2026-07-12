# Administración de combo y platter (endpoints + seeds + admin web)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea a tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** Hoy `ComboSlot` (huecos de un menú combo) y `PlatterComponent`
(ingredientes de un plato combinado) solo existen porque se seedan
directamente en base de datos — no hay ningún endpoint de administración
para crearlos, editarlos o borrarlos, y por tanto tampoco hay forma de
gestionar su `nameI18n` (ES/CA/EN) desde el admin web, a diferencia de
producto/sección/grupo de modificador (ver
`docs/superpowers/plans/2026-07-11-menu-multilingual-names.md`, Fase 1 Paso
3, donde se dejó esto explícitamente pendiente). Este plan cierra ese hueco:
CRUD de admin para ambas entidades, con `nameI18n` desde el primer día, más
las traducciones en los seeds existentes.

**Decisión de arquitectura (fijada):**

- **Anidado bajo el producto dueño.** Un `ComboSlot` no existe sin un
  producto tipo `combo` (su `ComboProductDefinition`); un `PlatterComponent`
  no existe sin un producto tipo `platter`. Los endpoints van anidados bajo
  `/restaurants/:restaurantId/products/:productId/...`, igual que hoy
  `MenuSection` va anidada bajo `/menus/:menuId/sections`.
- **Mismo patrón que sección/grupo de modificador**: DTO de request con
  `nameI18n?: NameI18nDto` opcional (reutilizando el `NameI18nDto`/`NameI18nDto`
  ya compartido), validado con `class-validator`, persistido en la columna
  `nameI18n Json?` que ya existe en el schema desde la Fase 1 del plan
  multiidioma — **no hace falta nueva migración**, la columna ya está.
  Auditoría (`AuditService.record()`) con `changedFields` igual que en los
  demás endpoints de escritura.
- **Clean architecture por módulo**: `domain/`, `application/{ports,use-cases}/`,
  `infrastructure/persistence/`, `presentation/rest/{dto}/`, siguiendo
  `CLAUDE.md`.
- **Validaciones de negocio a respetar**: un `ComboSlot` referencia
  `allowedProductIds` (deben existir como `RestaurantProduct` del mismo
  restaurante) y opcionalmente `defaultProductId` (debe estar en
  `allowedProductIds`); `minSelections <= maxSelections` y ambos `>= 0`. Un
  `PlatterComponent` referencia opcionalmente un `productId` (para poder
  sustituirlo) y lleva `removable`/`replaceable`/`quantity`/`sortOrder`.

**Tech Stack:** NestJS + Prisma (backend), Angular standalone + Transloco
(admin web).

## Restricciones globales

- Cambio aditivo: no se toca el endpoint de lectura `GET
  /restaurants/:id/menu` (ya devuelve `nameI18n` de combo/platter desde la
  Fase 1 del plan multiidioma) ni el modelo de datos (la columna ya existe).
- Los seeds existentes no deben romperse: añadir `nameI18n` a sus
  definiciones es aditivo y no cambia ningún `name` canónico.
- Ejecutar comandos de backend desde `backend/`, de frontend desde
  `frontend/`.

---

## Fase 0 — Seeds con nameI18n (independiente, sin backend nuevo)

**Archivos:**
- Modificar: `backend/prisma/seed.ts` (o el/los script(s) de seed que definan
  `ComboSlot`/`PlatterComponent`) — añadir `nameI18n: { es, ca, en }` a cada
  definición existente, junto al `name` canónico que ya tienen.

**Tareas:**

- [x] **Paso 1:** Añadido `nameI18n` a los 3 `ComboSlot` (Hamburguesa/Bebida/Acompañamiento) y a los 6 nombres distintos de `PlatterComponent` (Lomo, Huevo, Patatas fritas, Ensalada, Pollo, Verduras de temporada) en `backend/prisma/seeds/mesaflow-demo.seed.ts`, vía un mapa `platterComponentNameI18n` para los componentes (varios platters reutilizan el mismo nombre de componente) y constantes inline para los tres slots del combo. Cambio verificado con re-stage fresco + grep tras el commit (9 apariciones de `nameI18n` en el archivo).
- [x] **Paso 2:** **Confirmado por el usuario**: seed re-ejecutado en verde. El fallo inicial fue que el cliente de Prisma estaba desactualizado respecto a `schema.prisma` (que ya incluía `nameI18n` en `ComboSlot`/`PlatterComponent` desde la re-implementación de la Fase 1 del plan multiidioma); tras `pnpm prisma:generate` el seed corrió sin errores.

**Fase 0 cerrada.**

---

## Fase 1 — Backend: CRUD de ComboSlot

**Archivos:**
- Nuevo: DTOs `create-combo-slot.dto.ts` / `update-combo-slot.dto.ts` (con
  `name`, `nameI18n?`, `minSelections`, `maxSelections`, `isRequired`,
  `allowedProductIds`, `defaultProductId?`).
- Nuevo: puerto `combo-slot-repository.port.ts` + implementación Prisma.
- Nuevo: use-cases `create-combo-slot.use-case.ts`,
  `update-combo-slot.use-case.ts`, `delete-combo-slot.use-case.ts`, con
  validación de `allowedProductIds`/`defaultProductId` contra
  `RestaurantProduct` del mismo restaurante y de `minSelections <=
  maxSelections`.
- Nuevo/Modificar: controlador REST — `POST/PATCH/DELETE
  /restaurants/:restaurantId/products/:productId/combo-slots(/:slotId)`.
- Test: unit tests de los use-cases (validación de productos permitidos,
  rangos min/max, guardado de `nameI18n`).
- Test: test e2e/integración de los tres endpoints.

**Tareas:**

- [x] **Paso 1:** `CreateComboSlotDto`/`UpdateComboSlotDto` (+`CreateComboSlotOptionDto` anidado) con `nameI18n?` opcional reutilizando `NameI18nDto`, y `ComboSlotResponseDto`/`ComboSlotOptionResponseDto` de respuesta.
- [x] **Paso 2:** `combo-slot-repository.port.ts` + `PrismaComboSlotRepository`. Nota de diseño respecto al plan original: en vez de `allowedProductIds`/`defaultProductId` sueltos, se sigue el modelo real ya existente en el schema (`ComboSlotOption` por producto con `supplementPriceCents`/`isDefault` propios), que es más preciso que la simplificación del plan. `resolveComboProductContext()` resuelve el `:productId` de la ruta (un `RestaurantProduct.id`, igual que las rutas de producto existentes) a su `ComboDefinition`, verificando que sea del restaurante y de tipo `combo`, y la crea (`upsert`) la primera vez que se usa — no hay endpoint aparte para crear la `ComboDefinition`, no estaba en el alcance original. Las opciones del slot se reemplazan en bloque al actualizar (mismo patrón que `ModifierGroup`).
- [x] **Paso 3:** Use-cases `CreateComboSlotUseCase`/`UpdateComboSlotUseCase`/`DeleteComboSlotUseCase` con validaciones: `minSelections <= maxSelections`, al menos una opción, sin productos repetidos entre opciones, como mucho una opción marcada `isDefault`, y que todos los `restaurantProductId` referenciados pertenezcan al mismo restaurante. Nuevos códigos de error `combo_slot_not_found`/`invalid_combo_slot_configuration` añadidos a `shared/errors/application-error.ts` y mapeados a HTTP en `application-error.mapper.ts` (404/400 respectivamente).
- [x] **Paso 4:** `RestaurantComboSlotsController` con las tres rutas (`POST/PATCH/DELETE /restaurants/:id/products/:productId/combo-slots(/:slotId)`) y audit logging (`changedFields` incluyendo `nameI18n`); nuevo tipo `'combo-slot'` añadido a `AuditEntityType`. Todo registrado en `restaurants.module.ts` (controller + use-cases + provider `COMBO_SLOT_REPOSITORY`).
- [x] **Paso 5:** **Confirmado por el usuario**: `pnpm test` en `backend/` — 312 tests en 79 archivos, todos en verde. No se han escrito tests e2e/integración de los endpoints en sí (cobertura pendiente si se quiere reforzar), pero no hay regresiones.

**Fase 1 cerrada.**

---

## Fase 2 — Backend: CRUD de PlatterComponent

**Archivos:** análogos a la Fase 1, para `PlatterComponent`
(`create-platter-component.dto.ts`, puerto+repositorio, use-cases,
controlador `POST/PATCH/DELETE
/restaurants/:restaurantId/products/:productId/platter-components(/:id)`).

**Tareas:**

- [x] **Paso 1:** `CreatePlatterComponentDto`/`UpdatePlatterComponentDto` con `nameI18n?` opcional, y `PlatterComponentResponseDto` de respuesta.
- [x] **Paso 2:** `platter-component-repository.port.ts` + `PrismaPlatterComponentRepository`. Nota de diseño: `componentProductId` referencia `Product.id` (catálogo de organización), no `RestaurantProduct.id` — así lo define el schema (`PlatterComponent.componentProductId` apunta a `Product`, a diferencia de `ComboSlotOption` que apunta a `RestaurantProduct`). `resolvePlatterProductContext()` resuelve el `:productId` de la ruta a su `PlatterDefinition`, verificando restaurante + tipo `platter`, y la crea (`upsert`) la primera vez, igual que `ComboDefinition` en la Fase 1.
- [x] **Paso 3:** Use-cases `CreatePlatterComponentUseCase`/`UpdatePlatterComponentUseCase`/`DeletePlatterComponentUseCase` con validaciones: `quantity >= 1` si se indica, y que `componentProductId` (si se indica) pertenezca a la misma organización que el restaurante. Nuevos códigos de error `platter_component_not_found`/`invalid_platter_component_configuration` añadidos y mapeados a HTTP (404/400).
- [x] **Paso 4:** `RestaurantPlatterComponentsController` con las tres rutas (`POST/PATCH/DELETE /restaurants/:id/products/:productId/platter-components(/:componentId)`) y audit logging; nuevo tipo `'platter-component'` añadido a `AuditEntityType`. Todo registrado en `restaurants.module.ts`.
- [x] **Paso 5:** **Confirmado por el usuario**: `pnpm test` en `backend/` — 328 tests en 82 archivos, todos en verde. No se han escrito tests e2e/integración de los endpoints en sí (cobertura pendiente si se quiere reforzar), pero no hay regresiones.

**Fase 2 cerrada.**

---

## Fase 3 — Admin web: editor de combo y platter

**Archivos:**
- Modificar: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
  — DTOs de request para combo-slot y platter-component (con `nameI18n?`).
- Modificar: `frontend/src/app/features/menu/services/menu-api.service.ts`
  — métodos `createComboSlot`/`updateComboSlot`/`deleteComboSlot` y
  `createPlatterComponent`/`updatePlatterComponent`/`deletePlatterComponent`.
- Modificar: `product-editor-page` — nueva sección visible solo cuando
  `product.type === 'combo'` (lista editable de slots: nombre ES/CA/EN,
  productos permitidos, producto por defecto, min/max, obligatorio) o
  `'platter'` (lista editable de componentes: nombre ES/CA/EN, producto
  asociado opcional, cantidad, quitable/sustituible).
- Modificar: `frontend/public/i18n/{es,en,ca}.json` — etiquetas nuevas.
- Test: specs de `menu-api.service.spec.ts` para los métodos nuevos.

**Tareas:**

- [x] **Paso 1:** Tipos de request/response con `nameI18n` añadidos a
  `restaurant-pos-api.models.ts` (`CreateComboSlotRequest`/
  `UpdateComboSlotRequest`/`ComboSlotAdminDto` +
  `CreatePlatterComponentRequest`/`UpdatePlatterComponentRequest`/
  `PlatterComponentAdminDto`, con nombres "Admin" para no chocar con los
  tipos de solo-lectura `RestaurantMenuComboSlotDto`/
  `RestaurantMenuPlatterComponentDto` ya existentes en el mismo archivo).
- [x] **Paso 2:** Métodos nuevos en `restaurant-pos-api.service.ts`
  (`createComboSlot`/`updateComboSlot`/`deleteComboSlot`/
  `createPlatterComponent`/`updatePlatterComponent`/`deletePlatterComponent`)
  y sus wrappers correspondientes en `menu-api.service.ts`. Nota de diseño:
  como no hay endpoint admin de lectura para combo-slots/platter-components
  (fuera de alcance de este plan, y el endpoint de lectura no se toca), se
  añadió `MenuApiService.getComboOrPlatterData()`, que reutiliza `GET
  /restaurants/:id/menu` y busca el item por `restaurantProductId` — cambio
  aditivo, no modifica el mapeo existente `getMenu()`. Limitación conocida:
  los DTOs de lectura (`RestaurantMenuComboSlotOptionDto`/
  `RestaurantMenuPlatterComponentDto`) no incluyen `isDefault` (opciones de
  combo) ni `componentProductId`/`quantity` (componentes de platter), así
  que el editor no puede precargar esos tres campos al editar un slot/
  componente ya existente — el usuario debe re-marcar el producto por
  defecto de un slot si quiere cambiarlo, y el selector de producto/cantidad
  de un componente existente empieza vacío ("sin cambios": si se deja vacío
  al guardar, no se toca el valor ya guardado en backend, gracias a que el
  update es parcial).
- [x] **Paso 3:** UI de combo en `product-editor-page` (visible solo si
  `existingProduct().productType === 'combo'`): lista de slots con inputs
  ES/CA/EN, min/max selecciones, obligatorio, y por slot una lista de
  opciones (producto restaurante-scoped vía `app-select`, suplemento de
  precio, radio de "por defecto"). Guardado: como el backend reemplaza las
  opciones de un slot en bloque (Fase 1 Paso 2), no hace falta diff a nivel
  de opción — solo crear/actualizar/borrar a nivel de slot.
- [x] **Paso 4:** UI de platter en `product-editor-page` (visible solo si
  `productType === 'platter'`): lista de componentes con inputs ES/CA/EN,
  selector de producto asociado (catálogo de organización, vía `productId`
  de `RestaurantProductSummaryDto` — ver asimetría de esquema documentada en
  Fase 2 Paso 2), cantidad, y switches quitable/sustituible.
- [x] **Paso 5:** Copy en `es.json`/`en.json`/`ca.json` (bloques `menu.product.form.combo.*` y `menu.product.form.platter.*`, JSON verificado válido). **Confirmado por el usuario**: `pnpm test`/`pnpm build` en `frontend/` en verde — 997 tests en 111 archivos. Único ajuste necesario: `product-editor-page.spec.ts` no mockeaba `listProducts` en `MenuApiService` (nuevo en esta fase); se añadió el `vi.fn()`, su inyección en `useValue` y un valor por defecto `of([])` en `beforeEach`. El componente en sí no se tocó.

**Fase 3 cerrada.**

---

## Fase 4 — Cierre

**Tareas:**

- [x] **Paso 1:** Marcada como resuelta la nota pendiente de
  `docs/superpowers/plans/2026-07-11-menu-multilingual-names.md`: Fase 1
  Paso 3 (backend) y el punto de Fase 2 Paso 3 sobre "Combo y platter: sin
  UI" ahora enlazan a este plan como la resolución.
- [x] **Paso 2:** Revisados `docs/mobile-app.md` y `CLAUDE.md` — ninguno
  necesita cambios. `CLAUDE.md` no menciona combo/platter en absoluto (no
  documenta endpoints concretos de admin). `docs/mobile-app.md` solo
  documenta el lado de **lectura** (`nameI18n` en la respuesta de `GET
  /menu` y su resolución client-side en la app Android), que no cambia con
  este plan: los nuevos endpoints son de escritura (admin web) y no tocan
  ese contrato de lectura.

**Fase 4 cerrada. Plan `2026-07-12-combo-platter-admin.md` completo.**
