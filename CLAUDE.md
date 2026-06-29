# MesaFlow POS — Guía de Claude Code

Proyecto de fin de máster: TPV full-stack de restaurante (MesaFlow). Frontend Angular + backend NestJS con arquitectura limpia.

## Estructura del repositorio

```txt
.
├── frontend/   # Angular, Tailwind CSS, Transloco, Storybook, Vitest, Testing Library, Playwright
└── backend/    # NestJS, Prisma, PostgreSQL, Vitest, Supertest, Testcontainers
```

Codex skills originales del proyecto en `.codex/skills/`.

---

## Stack

**Frontend:** Angular (signal-first, standalone), Tailwind CSS, Transloco (`es`/`en`/`ca`), Storybook, Vitest, Testing Library, Playwright.

**Backend:** NestJS 11, Prisma, PostgreSQL, Swagger, Vitest, Supertest, Testcontainers.

**Herramientas:** pnpm, TypeScript, Docker.

---

## Comandos

Ejecutar desde `frontend/` o `backend/` según el área que se cambie.

### Frontend

```bash
pnpm test -- --watch=false
pnpm test -- --watch=false --reporter=verbose path/to/file.spec.ts   # spec concreto
pnpm test:e2e
pnpm storybook
pnpm build
pnpm build-storybook
```

### Backend

```bash
pnpm dev
pnpm build
pnpm test
pnpm test -- path/to/file.spec.ts                 # spec concreto
pnpm test -- -t "nombre del test"                 # filtro por nombre
pnpm test:integration   # requiere Docker (Testcontainers)
pnpm test:e2e
pnpm prisma:generate
pnpm prisma:migrate     # genera migración local
pnpm prisma:deploy      # aplica migraciones comprometidas
pnpm prisma:seed
```

Convención de archivos de test backend:
- Unitarios/aplicación: `*.spec.ts`
- Integración (Testcontainers): `*.integration-spec.ts`
- E2E (Supertest): en carpeta `test/` con config `vitest.e2e.config.ts`

No ejecutar servidores Angular ni Storybook ocultos en segundo plano. Mantenerlos visibles para ver errores.

---

## Routing de tareas

| Área del cambio | Enfoque |
|---|---|
| Angular frontend, UI, Vitest, Testing Library, Playwright, Storybook | TDD frontend Angular |
| Backend NestJS: módulos, controladores, DTOs, guards, casos de uso | Workflow NestJS backend |
| Schema Prisma, migraciones, seeds, repositorios Prisma | Workflow Prisma datos |
| Nuevo componente UI compartido | Scaffold componente UI + TDD frontend |
| Verificación final frontend | Lista de comprobación frontend |
| Verificación final backend | Lista de comprobación backend |
| Diagramas Mermaid en docs | Validador Mermaid |

Preferir una skill principal; añadir secundaria solo cuando aporta valor procedimental distinto.

---

## Workflow TDD

Seguir el ciclo rojo-verde-refactor:

1. Escribir o actualizar el test enfocado primero.
2. Ejecutar el test y confirmar que falla por la razón esperada.
3. Implementar el cambio mínimo útil.
4. Ejecutar el test hasta que pase.
5. Refactorizar mientras los tests siguen en verde.
6. Ampliar verificación cuando el cambio afecta UI compartida, rutas, estado, stories o docs.

Si el primer test pasa antes de la implementación, revisar el test: debe probar el comportamiento ausente.

### BDD para documentación funcional

Usar Gherkin para criterios de aceptación y flujos importantes:

```gherkin
Feature: Gestión de pedido

Scenario: Añadir producto a un pedido abierto
  Given la mesa tiene un pedido activo
  When el empleado selecciona un producto
  Then el producto aparece en las líneas del pedido
  And el total del pedido se actualiza
```

Usar Mermaid para arquitectura y flujos técnicos. Usar BDD para comportamiento esperado.

### Diamante de tests

Preferir:

- Muchos tests de integración/componente con Testing Library.
- Pocos tests unitarios para lógica pura.
- Muy pocos tests Playwright e2e para flujos críticos.

Escribir tests alrededor de comportamiento visible: roles, etiquetas, texto, validaciones, estados deshabilitados, eventos, transiciones de estado, atributos de accesibilidad.

---

## Frontend Angular

### Jerarquía de stores del POS

```
RestaurantContextStore         — lista de restaurantes + restaurante activo (carga desde API)
RestaurantPosStore             — facade principal; delega en:
  ├─ RestaurantFloorStore      — plano de sala, elementos, mesas
  └─ RestaurantOrderStore      — pedidos por mesa, líneas, cocina, pagos
```

`RestaurantOrderStore` usa `MenuMockService` como fallback de productos si `hydrateProducts()` no se ha llamado con datos reales del backend. Las mutaciones de líneas de pedido (addProduct, increaseOrderLine, etc.) actualmente son solo locales.

`RestaurantContextStore` auto-selecciona el restaurante si solo hay uno. Si hay varios, `activeRestaurant` es `null` hasta que se llame a `setActiveRestaurantId()` (método aún no implementado — actualmente no existe selector de restaurante).

### Directrices

- Preferir componentes standalone.
- Preferir `input()`, `output()`, `model()`, `signal()` y `computed()`.
- Usar `effect()` solo para efectos secundarios necesarios.
- Mantener las APIs de los componentes tipadas.
- Preferir `inject()` cuando coincide con el estilo del proyecto.
- Evitar patrones Angular legacy salvo que el código existente o interop de librería lo requiera.

### Internacionalización

- Usar Transloco para texto visible en features y componentes UI compartidos.
- Evitar strings visibles hardcodeados salvo literales técnicos o identificadores internos no visibles.
- Mantener traducciones completas para `es`, `en` y `ca`.
- Usar `LocaleService` para fechas, formatos regionales y estado del idioma activo.
- Verificar cambios de idioma cuando un componente renderiza texto traducido o valores formateados por locale.
- Usar `provideI18nTesting()` en tests que usen texto traducido.

### Tema y modo de color

- Usar tokens CSS semánticos `--ui-*` y clases de tema existentes para UI que funcione en modo claro y oscuro.
- No añadir inputs como `darkMode`; el modo de color viene de `data-theme` y `ColorModeService`.
- Preservar contraste, foco visible y estados disabled/error en todos los modos.

### Tono del contenido

Texto en español, formal, amable y directo. Los mensajes deben describir el estado o la siguiente acción sin culpar al usuario.

- Preferir "Revisa el correo introducido." sobre "Correo inválido."
- Preferir "No hay tareas todavía." sobre "Sin datos."
- Preferir "La tarea se ha completado correctamente." sobre "Hecho."

---

## Componentes UI compartidos

Los componentes reutilizables viven en:

```txt
frontend/src/app/shared/ui/<component>/
```

Mantener juntos estos archivos:

```txt
<component>.ts
<component>.html
<component>.css
<component>.stories.ts
<component>.spec.ts
```

### Scaffold de componente nuevo

1. Inspeccionar componentes UI similares cercanos.
2. Escribir el spec enfocado primero para el comportamiento visible ausente.
3. Crear los archivos en la carpeta estándar con kebab-case.
4. Implementar la API mínima y template que satisfaga el test.
5. Añadir stories para los estados relevantes.
6. Actualizar `frontend/src/app/shared/ui/docs/*.mdx` si el componente añade o cambia una convención.

### API pública por defecto

- Variantes compartidas: `primary`, `secondary`, `neutral`, `danger`, `violet`.
- Tamaños compartidos: `sm`, `md`, `lg`.
- Apariencias: `default`, `minimal`.
- Usar `model()` para valores controlados con two-way binding.

### Stories

Incluir los estados que apliquen: `Default`, `Disabled`, `Error`, `Sizes`, `Variants`, y estados especiales (loading, selected, empty, etc.). Stories con texto o formato regional deben funcionar con el toolbar `Locale`. Todas las stories deben funcionar con el toolbar `Theme`.

### UI Change Checklist

Cuando se cambia un componente UI, su API o sus stories:

- Actualizar o añadir stories para los estados cambiados.
- Revisar `frontend/src/app/shared/ui/docs/*.mdx` y actualizar cuando cambien variantes, tamaños, fills, patrones de accesibilidad o convenciones.
- Ejecutar tests enfocados del componente tocado.
- Ejecutar `pnpm build-storybook` cuando cambien stories o docs MDX.

---

## Accesibilidad

- Preferir controles nativos: `button`, `input`, `select`, `textarea`.
- Usar etiquetas reales conectadas con `for` e `id`.
- Usar `aria-describedby` para textos de pista, descripción y error.
- Usar `aria-invalid="true"` para campos inválidos.
- Proporcionar estados de foco visibles.
- Evitar elementos interactivos anidados.
- Añadir `aria-label` cuando un control no tiene texto visible.

---

## Backend NestJS

### Arquitectura limpia

```txt
src/<feature>/domain/          # entidades, value objects, enums, eventos de dominio
src/<feature>/application/     # casos de uso y puertos
src/<feature>/infrastructure/  # persistencia, seguridad, adaptadores de seed
src/<feature>/presentation/rest/  # controladores, guards, DTOs
src/shared/                    # preocupaciones transversales (Prisma, eventos, resultado, errores)
```

Preferir extender un módulo existente (`identity`, `tasks`, `restaurants`) antes de crear un módulo nuevo. Al crear un módulo nuevo, reflejar la estructura existente.

Módulos actuales: `health`, `identity`, `tasks`, `restaurants`.

### Guards y autorización

Los guards se encadenan en orden en los controladores:

```
AuthGuard → RestaurantAccessGuard → PermissionsGuard
```

- **`AuthGuard`**: valida JWT Bearer, carga usuario + sesión + roles/permisos + scopes en `request.auth`. Los scopes se extraen de `UserRoleAssignment` (campo `organizationId` o `restaurantId`).
- **`RestaurantAccessGuard`**: activado por el decorador `@RequireRestaurantScope()`. Comprueba `request.auth.scopes.restaurants` o si hay alguna organización en scope. **Limitación conocida:** con scope de organización permite acceso a cualquier restaurante sin verificar que el restaurante pertenezca a esa organización.
- **`PermissionsGuard`**: activado por `@RequirePermissions(...permissions)`. Comprueba permisos globales del usuario, no ligados a scope.
- **`RolesGuard`**: activado por `@RequireRoles(...)`. Comprueba roles globales.

Patrón habitual en controladores de restaurante:

```typescript
@UseGuards(AuthGuard, RestaurantAccessGuard)
@RequireRestaurantScope()
@RequirePermissions('orders')
```

La respuesta de autenticación (`AuthResponseDto` backend) incluye `scopes: { organizations: string[]; restaurants: string[] }`. El modelo frontend `AuthResponseDto` en `identity-api.models.ts` **aún no incluye el campo `scopes`** y `IdentitySessionStore` tampoco lo persiste.

### Directrices NestJS

- Mantener módulos explícitos sobre controladores y providers.
- Mantener validación DTO y mapeo de transporte en el borde REST.
- Mantener guards pequeños y enfocados en autenticación/autorización.
- Usar tokens de provider tipados para puertos y elegir adaptadores en la capa de módulo.

### Tests backend

Preferir el test más pequeño que pruebe el comportamiento:

- Lógica de dominio pura: spec unitaria junto al archivo fuente.
- Caso de uso con adaptadores in-memory: spec de aplicación enfocada.
- Repositorio Prisma: spec de integración con Prisma + Testcontainers.
- Contrato REST, cookies, flujo auth, guard: spec e2e con Supertest.

### HTTP y API

- Mantener endpoints bajo `/api/v1`.
- Actualizar DTOs y response mappers juntos cuando cambie el contrato público.
- Mantener errores alineados con `backend/src/shared/http/application-error.mapper.ts`.
- Las rutas `/developer/*` requieren cookie `developer_access_token`.

### Persistencia con Prisma

- `backend/prisma/schema.prisma` es la fuente de verdad del modelo.
- `backend/prisma/migrations/` es la historia de la base de datos.
- Seeds en `backend/prisma/seeds/`, orquestados por `backend/prisma/seed.ts`.
- Preferir migraciones Prisma comprometidas sobre `db push` para cambios duraderos.
- Mantener seeds idempotentes cuando sea posible.
- Añadir spec de integración cuando cambia una query Prisma, transacción, relación o mapeo.

---

## Documentación

- Docs técnicos frontend: `frontend/docs/`
- Docs UI Storybook: `frontend/src/app/shared/ui/docs/`
- Docs técnicos backend: `backend/docs/`

Incluir diagramas Mermaid cerca del texto que explican cuando un diagrama aclara la arquitectura, flujos o estrategia de tests.

### Validar diagramas Mermaid

```bash
python C:\Users\Thor_\.codex\skills\mermaid-docs-validator\scripts\validate_mermaid_docs.py frontend\docs frontend\src\app\shared\ui\docs
```

Preferir `flowchart`, `sequenceDiagram` o `stateDiagram-v2`. Mantener diagramas pequeños y cercanos al texto que explican.

---

## Lista de comprobación — Verificación final frontend

Antes de cerrar trabajo frontend, ejecutar el conjunto mínimo que cubre el riesgo del cambio:

| Tipo de cambio | Verificación |
|---|---|
| Lógica pura o servicio | Test unitario/spec enfocado |
| Componente UI compartido | Spec componente + `pnpm build` si la API pública cambia |
| Story o docs MDX | `pnpm build-storybook` |
| Diagrama Mermaid | Validador Mermaid |
| Ruta o flujo crítico | Tests componente/integración + Playwright e2e |
| Cambio i18n | Locale por defecto + al menos un locale alternativo |
| Cambio tema/color | Comportamiento light y dark |

Checklist final:

- No se revirtieron cambios no relacionados del usuario.
- APIs de componentes públicas siguen tipadas y consistentes.
- Accesibilidad cubierta donde aplica.
- Stories y docs UI coinciden con estados, variantes y tamaños cambiados.
- Traducciones completas para `es`, `en` y `ca` si cambió texto visible.

---

## Lista de comprobación — Verificación final backend

Antes de cerrar trabajo backend:

| Tipo de cambio | Verificación |
|---|---|
| Dominio puro o helper | Spec unitaria/aplicación enfocada |
| Caso de uso con adaptadores in-memory | Spec caso de uso, luego `pnpm test` si es compartido |
| Controlador, guard, cookie, flujo auth | Spec e2e enfocada + `pnpm test:e2e` |
| Repositorio Prisma, relación, transacción | `pnpm test:integration` |
| Schema, migración o seed | Comando Prisma relevante + tests integración |
| Cambio de cableado de módulo | `pnpm build` + nivel de test más relevante |

Checklist final:

- No se revirtieron cambios no relacionados del usuario.
- Cableado de providers del módulo coincide con el adaptador y tokens de puerto previstos.
- DTOs, controladores y mappers de respuesta coinciden con el contrato API público.
- Adaptadores in-memory y Prisma se mantienen alineados donde implementan el mismo puerto.
- Seeds y migraciones reflejan los mismos supuestos de datos.

---

## Notas generales de edición

- Usar `pnpm` para comandos de dependencias y scripts.
- Mantener ediciones acotadas al componente o feature solicitado.
- No eliminar ni revertir cambios no relacionados del usuario.
- Preferir CSS legible y convenciones existentes del proyecto sobre añadir nuevas abstracciones prematuramente.
