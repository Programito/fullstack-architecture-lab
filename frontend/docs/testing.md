# Testing Frontend

El frontend sigue TDD y una estrategia de tests en forma de diamante. El objetivo es proteger el
comportamiento sin bloquear demasiado la implementación.

## BDD En La Documentación

Usa BDD para documentar comportamiento funcional, criterios de aceptación y flujos importantes antes
de convertirlos en tests.

```gherkin
Feature: Completar una tarea

Scenario: Completar una tarea pendiente
  Given la persona usuaria tiene una tarea pendiente
  When marca la tarea como completada
  Then la tarea aparece como completada
  And se muestra el mensaje "La tarea se ha completado correctamente."
```

BDD ayuda a acordar qué debe ocurrir. TDD ayuda a implementarlo con un test que falle primero.

## Ciclo TDD

```mermaid
flowchart LR
  Red["Escribir un test que falle"] --> Green["Implementar el cambio útil más pequeño"]
  Green --> Refactor["Refactorizar con tests en verde"]
  Refactor --> Red
```

Empieza con un test que falle por el motivo esperado. Si el test pasa antes de que exista la
funcionalidad, todavía no está probando el comportamiento.

## Test Diamond

```mermaid
flowchart TB
  E2E["Pocos tests e2e<br/>Recorridos críticos"]
  Integration["Muchos tests de integración/componentes<br/>Comportamiento, accesibilidad, estado, eventos"]
  Unit["Pocos tests unitarios<br/>Lógica pura y casos límite"]

  E2E --> Integration
  Integration --> Unit

  style E2E fill:#f8fafc,stroke:#64748b,stroke-width:1px
  style Integration fill:#ecfeff,stroke:#0891b2,stroke-width:2px
  style Unit fill:#f8fafc,stroke:#64748b,stroke-width:1px
```

## Tests Preferidos

- Usa Testing Library para tests de componentes e integración.
- Busca elementos por rol accesible, label, placeholder, texto visible o estado orientado a usuario.
- Prueba eventos emitidos, estados deshabilitados, validación, atributos ARIA y clases importantes.
- Reserva tests unitarios estrechos para funciones puras, reducers, formatters y lógica con bordes claros.
- Usa Playwright para flujos críticos que dependan de rutas, navegador o páginas reales.

## UI De Feature

Para cambios de UI dentro de una feature, empieza con el test más cercano al comportamiento y amplía
solo cuando el estado real viva fuera del componente.

Patrón recomendado:

- Component spec para comprobar render accesible, labels, roles, eventos emitidos y estados ARIA.
- Page spec cuando el componente recibe datos ya filtrados o cuando la page coordina signals, store,
  búsqueda, favoritos, categorías o selección.
- Store spec cuando cambia una regla de negocio o un cálculo compartido.
- Build final cuando cambien templates, imports standalone, clases Tailwind nuevas o barrels de
  modelos.

Ejemplo: un diálogo de búsqueda puede tener un spec que valide `radio`, `combobox`, `aria-pressed`,
estrella favorita y eventos emitidos. La page debe cubrir que favoritos, búsqueda y categoría filtran
los productos reales.

## Decisiones UX En Tests

No pruebes todas las clases visuales. Sí conviene proteger clases cuando representan una decisión UX
concreta y fácil de romper:

- `focus-visible` para evitar anillos de foco después de clicks de ratón.
- Alturas fijas o scroll interno cuando un modal debe mantener tamaño estable.
- Estados ARIA como `aria-pressed`, `aria-expanded`, `aria-selected` y `aria-checked`.
- Labels accesibles de botones icon-only, buscadores, selects y controles segmentados.

Si el test solo repite Tailwind sin explicar comportamiento, prefiere buscar una señal más cercana a
la persona usuaria: rol, nombre accesible, texto visible, estado ARIA o evento emitido.

## Comandos

Ejecuta desde `frontend/`:

```txt
pnpm test -- --watch=false
pnpm test:e2e
pnpm build
pnpm build-storybook
```

Ejecuta tests enfocados durante TDD y amplía la verificación antes de cerrar cambios compartidos o
de mayor riesgo.
