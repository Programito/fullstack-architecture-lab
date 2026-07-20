# Frontend

[← Main README](../README.md)

[English](#english) · [Español](#español)

## English

MesaFlow web frontend. Angular 21 standalone application organized by feature, with signal-first state, Transloco internationalization, shared UI components, Storybook, Vitest/Testing Library and Playwright.

### Structure

```txt
src/app/
+-- core/              # cross-cutting services, HTTP, errors and observability
+-- features/          # route-level business features
+-- shared/ui/         # reusable UI components, stories and specs
+-- shared/i18n/       # Transloco setup and testing helpers
`-- app.routes.ts      # main route map and guards
```

Main feature areas include identity/login, restaurant POS service, menu administration, kitchen, layout, reservations, dashboard and developer pages.

### Development

```bash
pnpm install
pnpm start
# http://localhost:4200
```

### Useful commands

```bash
pnpm test -- --watch=false   # unit/component tests
pnpm test:e2e                # Playwright e2e tests
pnpm storybook               # Storybook dev server, http://localhost:6006
pnpm build
pnpm build-storybook
```

Use `pnpm` from this folder. `pnpm test:e2e` runs Playwright through the project script.

### Storybook and developer resources

The shared UI library lives in `src/app/shared/ui/`. Keep component implementation, template, styles, tests and stories together.

The backend also serves a **prebuilt, static** copy of Storybook at `http://localhost:3000/developer/storybook/`. That copy is a snapshot of the latest `pnpm build-storybook`; it does not update automatically when stories or components change.

### Quality notes

- Prefer standalone components and feature-local state.
- Use Angular signals for local UI state and derived view models.
- Keep user-facing text in Transloco dictionaries.
- Update stories and focused specs when changing shared UI components.

See [docs/architecture.md](docs/architecture.md), [docs/testing.md](docs/testing.md) and [docs/developer-tables.md](docs/developer-tables.md) for frontend-specific documentation.

---

## Español

Frontend web de MesaFlow. Aplicación Angular 21 standalone organizada por features, con estado signal-first, internacionalización con Transloco, componentes UI compartidos, Storybook, Vitest/Testing Library y Playwright.

### Estructura

```txt
src/app/
+-- core/              # servicios transversales, HTTP, errores y observabilidad
+-- features/          # features de negocio a nivel de ruta
+-- shared/ui/         # componentes UI reutilizables, historias y specs
+-- shared/i18n/       # configuración Transloco y helpers de test
`-- app.routes.ts      # mapa principal de rutas y guards
```

Las áreas funcionales principales incluyen identidad/login, servicio del TPV, administración de menú, cocina, plano de sala, reservas, dashboard y páginas developer.

### Desarrollo

```bash
pnpm install
pnpm start
# http://localhost:4200
```

### Comandos útiles

```bash
pnpm test -- --watch=false   # tests unitarios/componentes
pnpm test:e2e                # tests e2e con Playwright
pnpm storybook               # Storybook en desarrollo, http://localhost:6006
pnpm build
pnpm build-storybook
```

Usa `pnpm` desde esta carpeta. `pnpm test:e2e` ejecuta Playwright mediante el script del proyecto.

### Storybook y recursos developer

La librería UI compartida vive en `src/app/shared/ui/`. Mantén juntos implementación, template, estilos, tests e historias de cada componente.

El backend también sirve una copia **estática y precompilada** de Storybook en `http://localhost:3000/developer/storybook/`. Esa copia es una foto del último `pnpm build-storybook`; no se actualiza sola al cambiar historias o componentes.

### Notas de calidad

- Prioriza componentes standalone y estado local por feature.
- Usa signals de Angular para estado de UI y modelos derivados.
- Mantén los textos visibles en los diccionarios de Transloco.
- Actualiza historias y specs enfocados al cambiar componentes UI compartidos.

Consulta [docs/architecture.md](docs/architecture.md), [docs/testing.md](docs/testing.md) y [docs/developer-tables.md](docs/developer-tables.md) para documentación específica del frontend.
