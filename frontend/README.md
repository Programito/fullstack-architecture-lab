# Frontend

[← Main README](../README.md)

[English](#english) · [Español](#español)

## English

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.12.

### Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

### Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

### Storybook

To browse the component library with live reload, run:

```bash
pnpm storybook
```

This starts Storybook in dev mode (default port `6006`), rebuilding automatically as you edit components and stories.

The backend also serves a **prebuilt, static** copy of Storybook at `http://localhost:3000/developer/storybook/` (see `backend/src/main.ts`). That copy is a snapshot of whatever was last built — it does **not** update automatically when you edit stories or components. After changing anything under `frontend/src/app/shared/ui/**` (or any other story), rebuild it with:

```bash
pnpm build-storybook
```

This regenerates `frontend/storybook-static/`. Reload `http://localhost:3000/developer/storybook/` afterwards (no backend restart needed) to see the changes.

### Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

### Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

### Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

---

## Español

Este proyecto se generó con [Angular CLI](https://github.com/angular/angular-cli) versión 21.2.12.

### Servidor de desarrollo

Para arrancar un servidor de desarrollo local, ejecuta:

```bash
ng serve
```

Con el servidor corriendo, abre el navegador en `http://localhost:4200/`. La aplicación se recarga automáticamente al modificar cualquier archivo fuente.

### Scaffolding de código

Angular CLI incluye potentes herramientas de scaffolding. Para generar un componente nuevo, ejecuta:

```bash
ng generate component nombre-componente
```

Para ver la lista completa de schematics disponibles (`components`, `directives`, `pipes`, etc.), ejecuta:

```bash
ng generate --help
```

### Build

Para compilar el proyecto, ejecuta:

```bash
ng build
```

Esto compila el proyecto y guarda los artefactos en el directorio `dist/`. Por defecto, el build de producción optimiza la aplicación para rendimiento y velocidad.

### Storybook

Para navegar la librería de componentes con recarga en vivo, ejecuta:

```bash
pnpm storybook
```

Esto arranca Storybook en modo desarrollo (puerto por defecto `6006`), reconstruyendo automáticamente al editar componentes e historias.

El backend también sirve una copia **estática y precompilada** de Storybook en `http://localhost:3000/developer/storybook/` (ver `backend/src/main.ts`). Esa copia es una foto fija del último build realizado — **no** se actualiza sola al modificar historias o componentes. Tras cambiar algo en `frontend/src/app/shared/ui/**` (o cualquier otra historia), reconstrúyela con:

```bash
pnpm build-storybook
```

Esto regenera `frontend/storybook-static/`. Recarga después `http://localhost:3000/developer/storybook/` (no hace falta reiniciar el backend) para ver los cambios.

### Tests unitarios

Para ejecutar los tests unitarios con el test runner [Vitest](https://vitest.dev/), usa:

```bash
ng test
```

### Tests end-to-end

Para tests end-to-end (e2e), ejecuta:

```bash
ng e2e
```

Angular CLI no incluye un framework de e2e por defecto. Puedes elegir el que mejor se ajuste a tus necesidades.

### Recursos adicionales

Para más información sobre Angular CLI, incluida la referencia detallada de comandos, visita la página [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).
