# AGENTS.md

## Alcance

Estas instrucciones aplican al frontend Angular de esta carpeta.

Usa el `AGENTS.md` de la raíz para reglas generales del repositorio. Usa este archivo al cambiar
código Angular, tests de frontend, historias de Storybook, componentes UI o documentación frontend.

## Fuentes Oficiales Primero

Cuando haga falta información externa, prioriza documentación oficial:

- Angular: `angular.dev`
- Angular Testing Library: `testing-library.com/docs/angular-testing-library`
- Vitest: `vitest.dev`
- Playwright: `playwright.dev`
- Storybook: `storybook.js.org`
- Tailwind CSS: `tailwindcss.com`

Prefiere los patrones locales del proyecto sobre ejemplos genéricos cuando el código ya muestre una
convención clara.

## Flujo TDD

Usa un ciclo red-green-refactor para cambios frontend:

1. Escribe o actualiza primero el test enfocado.
2. Ejecuta el test enfocado y confirma que falla por el motivo esperado.
3. Implementa el cambio útil más pequeño.
4. Ejecuta el test enfocado hasta que pase.
5. Refactoriza solo después de cubrir el comportamiento.
6. Ejecuta una verificación más amplia cuando el área tocada sea compartida.

Si un test pasa antes de que exista la implementación, revisa el test hasta que pruebe el
comportamiento que falta.

## Documentación BDD

Usa BDD para documentar comportamiento funcional, criterios de aceptación y flujos relevantes.
Prefiere formato Gherkin cuando ayude a expresar el comportamiento desde el punto de vista de la
persona usuaria:

```gherkin
Feature: Completar una tarea

Scenario: Completar una tarea pendiente
  Given la persona usuaria tiene una tarea pendiente
  When marca la tarea como completada
  Then la tarea aparece como completada
  And se muestra el mensaje "La tarea se ha completado correctamente."
```

No uses BDD para todo. Usa Mermaid para arquitectura y flujos técnicos; usa BDD para comportamiento
esperado; usa TDD para llevar ese comportamiento a tests y código.

## Test Diamond

Prefiere una estrategia en forma de diamante:

- Muchos tests de integración/componentes con Testing Library.
- Menos tests unitarios estrechos para lógica pura aislada.
- Un número pequeño de tests e2e con Playwright para flujos críticos.

Da prioridad a tests que describan comportamiento visible, roles accesibles, labels, eventos,
validación, cambios de estado e integración entre template y lógica del componente.

## Estilo Angular

- Prefiere componentes standalone.
- Prefiere `input()`, `output()`, `model()`, `signal()`, `computed()` y patrones compatibles con signals.
- Mantén tipados inputs, outputs, variantes, tamaños y APIs públicas.
- Usa `effect()` con moderación y solo cuando haga falta un efecto secundario real.
- Mantén templates legibles y evita llevar lógica de negocio al HTML.
- Prefiere inyección de dependencias con `inject()` cuando encaje con el estilo del proyecto.
- Evita patrones legacy salvo que lo requiera una API de Angular, interoperabilidad o contrato existente.

## Componentes UI

Los componentes UI reutilizables viven en `src/app/shared/ui/<component>/`.

Mantén juntos implementación, template, estilos, historias de Storybook y tests:

```txt
<component>.ts
<component>.html
<component>.css
<component>.stories.ts
<component>.spec.ts
```

Al cambiar un componente UI:

- Actualiza historias para los estados relevantes.
- Actualiza `src/app/shared/ui/docs/*.mdx` cuando cambien convenciones de componentes.
- Conserva accesibilidad con controles nativos, foco visible, labels y atributos ARIA útiles.
- Ejecuta tests enfocados del componente.
- Ejecuta `pnpm build-storybook` cuando cambien historias o docs MDX.

## Tono De Los Textos

Usa textos amables, formales y directos en UI y documentación.

- Preferir: "Revisa el correo introducido."
- Evitar: "Correo inválido."
- Preferir: "No hay tareas todavía."
- Evitar: "Sin datos."
- Preferir: "La tarea se ha completado correctamente."
- Evitar: "Hecho."

Los mensajes deben explicar el estado o la siguiente acción sin culpar a la persona usuaria.

## Documentación

La documentación técnica del frontend vive en `frontend/docs/`.

Usa Markdown con diagramas Mermaid al describir arquitectura, flujos, dependencias o estrategia de
testing. Mantén los diagramas cerca de la explicación que apoyan y actualízalos cuando cambie la
estructura documentada.

## Skills Locales

Las copias locales de skills frontend viven en:

```txt
frontend/.codex/skills/
```

Manténlas sincronizadas con las versiones compartidas en:

```txt
.codex/skills/
```

## Comandos

Ejecuta comandos desde `frontend/`:

- `pnpm test -- --watch=false`
- `pnpm test:e2e`
- `pnpm build`
- `pnpm build-storybook`

No ejecutes servidores de Angular o Storybook ocultos en segundo plano.
