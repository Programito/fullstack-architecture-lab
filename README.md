# MesaFlow POS

[English](#english) · [Español](#español)

## English

### a. Project overview

Full-stack restaurant POS. Signal-first Angular frontend and NestJS backend with clean architecture. MesaFlow covers the main restaurant workflows: floor service, ordering, kitchen preparation, menu administration, reservations, analytics and technical operations, plus a native Android client app for table-side ordering.

### b. Technology stack

- **Frontend:** Angular 21 (standalone, signals), Tailwind CSS, Transloco (es/en/ca), Storybook, Vitest, Testing Library and Playwright.
- **Backend:** NestJS 11, Prisma, PostgreSQL, Swagger, Vitest, Supertest and Testcontainers.
- **Mobile:** Kotlin, Jetpack Compose, Material 3 Expressive, MVVM/UDF, Hilt.
- **Tooling:** pnpm, TypeScript and Docker.

### c. Installation and running

#### Requirements

- Node.js 20 or higher.
- pnpm 11.2.2 or higher.
- Docker (optional) for local PostgreSQL and Testcontainers integration tests.

#### Installation

```bash
cd frontend && pnpm install
cd backend  && pnpm install
```

#### Running in development

##### Frontend

```bash
cd frontend
pnpm start
# http://localhost:4200
```

##### Backend

```bash
cd backend
pnpm dev
# http://localhost:3000
# Docs (requires developer role): http://localhost:3000/developer/api-docs/
```

##### Mobile

Open the `mobile/` folder in Android Studio and run on an emulator or device (API 26+). See [mobile/README.md](mobile/README.md) for setup details.

### d. Project structure

```txt
.
+-- frontend/   # Angular signal-first, organized by feature, shared UI, Storybook and e2e
+-- backend/    # NestJS, clean architecture, Prisma and tests
+-- mobile/     # Android native client app with MVVM/UDF (Kotlin, Jetpack Compose)
`-- docs/       # Technical plans, architecture notes and complementary documentation
```

- `frontend/`: standalone Angular application organized by feature, with signal-first state, shared UI components and visual documentation in Storybook.
- `backend/`: NestJS API versioned under `/api/v1`, organized with clean architecture across domain, application, infrastructure and presentation layers.
- `mobile/`: Android client app organized with MVVM/UDF, Compose UI, Hilt dependency injection and repositories for network/local persistence.
- `docs/`: technical plans, implementation notes and complementary architecture documentation.

See [frontend/README.md](frontend/README.md), [backend/README.md](backend/README.md) and [mobile/README.md](mobile/README.md) for app-specific setup and commands.

### e. Main features

- **Floor plan:** interactive layout with tables and stools, selection and realtime status.
- **Order:** add simple products, with modifiers, combos and kitchen notes. Backend-first flow: the store only updates from the server response.
- **Kitchen:** preparation board with Pending / Preparing / Ready columns.
- **Service:** send to kitchen, mark as served, charge and free the table.
- **Menu:** category, product and availability management. Products with modifier groups, combos with configurable slots and surcharge pricing.
- **Reservations:** daily agenda with filters, quick actions and manual booking.
- **Identity:** JWT authentication with roles, granular permissions and restaurant/organization scopes.
- **Internationalization:** Spanish, English and Catalan with Transloco.
- **Theme:** light and dark mode with semantic `--ui-*` CSS tokens.
- **Analytics:** per-restaurant KPI dashboard and charts, with date ranges resolved in the restaurant's timezone.
- **Developer area:** protected access for the `developer` role with Swagger/API documentation, Storybook, architecture links, database table relationships and the technical/audit log dashboard.
- **Observability and audit:** technical logs, business audit trail and `/developer/logs` dashboard, with Sentry as an env-flag-enabled complement.
- **Realtime orders:** WebSocket invalidations with polling fallback, feature-flagged.
- **Product images:** signed upload from the menu admin, with external storage.
- **Demo accounts:** public access without credentials, isolated from real users' data and audit trail.

### f. Demo users

MesaFlow includes demo user types that can be used from the public demo selector when demo login is enabled. They are scoped to the demo restaurant and are isolated from real user data and audit history.

| Demo type | Intended channel | Available modules |
| --- | --- | --- |
| Admin | Web staff demo | Service, time tracking, menu, kitchen, floor layout, reservations, analytics dashboard and user administration. |
| Manager | Web staff demo | Service, time tracking, menu, kitchen, floor layout, reservations and analytics dashboard. |
| Waiter | Web staff demo | Service, time tracking, floor layout and reservations. |
| Kitchen | Web staff demo | Kitchen board and time tracking. |
| Developer | Web technical demo | Developer area with Swagger/API documentation, Storybook, architecture links, database table relationships and technical/audit logs. |
| Customer | Android client demo | Mobile table flow: enter by QR/demo, browse menu, configure products, place orders, manage reservations and checkout. |

### Production

- **Frontend:** https://fullstack-architecture-lab-crao.vercel.app
- **Backend:** https://fullstack-architecture-lab.onrender.com
- **Android:** [Download the latest APK](https://github.com/Programito/fullstack-architecture-lab/releases/download/v0.1.0/mesaflow-0.1.0.apk) ([release notes](https://github.com/Programito/fullstack-architecture-lab/releases/latest))
- **Health:** https://fullstack-architecture-lab.onrender.com/api/v1/health

The production demo runs on a free managed database tier. After a period of inactivity, the first request may need a short warm-up while the database and backend connection wake up; subsequent requests should respond normally.

### Future improvements

- **User creation:** complete the staff onboarding flow with invitations, role assignment and restaurant-scoped access.
- **Restaurant creation:** add an admin workflow to create restaurants, configure service areas and initialize demo-ready data.
- **Floor sections:** support multiple service areas such as dining room, terrace, bar and private rooms within the same restaurant.
- **Bank payment gateways:** integrate real payment providers for card authorization, settlement status and payment reconciliation.

### Backend environment variables

```bash
cd backend
cp .env.example .env
```

Main variables:

```txt
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/proyecto?schema=public"
FRONTEND_ORIGIN="http://localhost:4200"
IDENTITY_MEMORY_SEED=true
```

With `IDENTITY_MEMORY_SEED=true` the backend starts without PostgreSQL, using in-memory adapters.

`FRONTEND_ORIGIN` accepts a comma-separated list of hosts. In production the frontend and backend run on different hosts, so it must include the deployed frontend origin, and `AUTH_COOKIE_SECURE=true` is required so the auth cookies (`SameSite=None; Secure`) are accepted cross-site:

```txt
FRONTEND_ORIGIN="http://localhost:4200,https://fullstack-architecture-lab-crao.vercel.app"
AUTH_COOKIE_SECURE=true
```

Locally keep `AUTH_COOKIE_SECURE=false`: cookies are then sent with `SameSite=Lax`, which works over plain HTTP on localhost.

### Local database

```bash
cd backend
docker compose up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### Useful commands

#### Frontend

```bash
pnpm test -- --watch=false   # unit tests
pnpm test:e2e                # Playwright
pnpm storybook               # http://localhost:6006
pnpm build
pnpm build-storybook
```

#### Backend

```bash
pnpm test                 # unit and application tests
pnpm test:e2e             # Supertest
pnpm test:integration     # Testcontainers (requires Docker)
pnpm build
```

### Tests

- **Frontend:** Vitest + Testing Library (components) and Playwright (e2e).
- **Backend:** Vitest (unit/application), Supertest (e2e) and Testcontainers (Prisma integration).

Run the commands from `frontend/` or `backend/` as appropriate.

---

## Español

### a. Descripción general del proyecto

TPV full-stack de restaurante. Frontend Angular con arquitectura signal-first y backend NestJS con arquitectura limpia. MesaFlow cubre los flujos principales de un restaurante: servicio de sala, pedidos, cocina, administración de carta, reservas, analíticas y operación técnica, además de una app Android nativa para pedidos desde la mesa.

### b. Stack tecnológico utilizado

- **Frontend:** Angular 21 (standalone, signals), Tailwind CSS, Transloco (es/en/ca), Storybook, Vitest, Testing Library y Playwright.
- **Backend:** NestJS 11, Prisma, PostgreSQL, Swagger, Vitest, Supertest y Testcontainers.
- **Mobile:** Kotlin, Jetpack Compose, Material 3 Expressive, MVVM/UDF, Hilt.
- **Herramientas:** pnpm, TypeScript y Docker.

### c. Instalación y ejecución

#### Requisitos

- Node.js 20 o superior.
- pnpm 11.2.2 o superior.
- Docker (opcional) para PostgreSQL local y tests de integración con Testcontainers.

#### Instalación

```bash
cd frontend && pnpm install
cd backend  && pnpm install
```

#### Ejecución en desarrollo

##### Frontend

```bash
cd frontend
pnpm start
# http://localhost:4200
```

##### Backend

```bash
cd backend
pnpm dev
# http://localhost:3000
# Docs (requiere rol developer): http://localhost:3000/developer/api-docs/
```

##### Mobile

Abre la carpeta `mobile/` en Android Studio y ejecuta en un emulador o dispositivo (API 26+). Consulta [mobile/README.md](mobile/README.md) para el detalle de la configuración.

### d. Estructura del proyecto

```txt
.
+-- frontend/   # Angular signal-first, ordenado por feature, UI compartida, Storybook y e2e
+-- backend/    # NestJS, arquitectura limpia, Prisma y tests
+-- mobile/     # App cliente Android nativa con MVVM/UDF (Kotlin, Jetpack Compose)
`-- docs/       # Planes técnicos, notas de arquitectura y documentación complementaria
```

- `frontend/`: aplicación Angular standalone organizada por features, con estado signal-first, componentes UI compartidos y documentación visual en Storybook.
- `backend/`: API NestJS versionada bajo `/api/v1`, organizada con arquitectura limpia en capas de dominio, aplicación, infraestructura y presentación.
- `mobile/`: app Android cliente organizada con MVVM/UDF, UI en Compose, inyección con Hilt y repositorios para red/persistencia local.
- `docs/`: planes técnicos, notas de implementación y documentación complementaria de arquitectura.

Consulta [frontend/README.md](frontend/README.md), [backend/README.md](backend/README.md) y [mobile/README.md](mobile/README.md) para la configuración y comandos específicos de cada app.

### e. Funcionalidades principales

- **Sala:** plano interactivo con mesas y taburetes, selección y estado en tiempo real.
- **Pedido:** añadir productos simples, con modificadores, combos y notas de cocina. Flujo backend-first: el store solo se actualiza con la respuesta del servidor.
- **Cocina:** board de preparación con columnas Pendiente / Preparándose / Preparado.
- **Servicio:** enviar a cocina, marcar como servido, cobrar y liberar mesa.
- **Menú:** gestión de categorías, productos y disponibilidad. Productos con grupos de modificadores, combos con slots configurables y precios por suplemento.
- **Reservas:** agenda diaria con filtros, acciones rápidas y alta manual.
- **Identidad:** autenticación JWT con roles, permisos granulares y scopes por restaurante u organización.
- **Internacionalización:** español, inglés y catalán con Transloco.
- **Tema:** modo claro y oscuro con tokens CSS semánticos `--ui-*`.
- **Analytics:** dashboard de KPIs y gráficos por restaurante, con rangos de fecha resueltos en la zona horaria del restaurante.
- **Área developer:** acceso protegido para el rol `developer` con documentación Swagger/API, Storybook, enlaces de arquitectura, relación de tablas de base de datos y dashboard de logs técnicos/auditoría.
- **Observabilidad y auditoría:** logs técnicos, auditoría de negocio y dashboard `/developer/logs`, con Sentry como complemento activable por variable de entorno.
- **Realtime de pedidos:** invalidaciones por WebSocket con fallback a polling, feature-flagged.
- **Imágenes de producto:** subida firmada desde el admin de menú, con almacenamiento externo.
- **Cuentas demo:** acceso público sin credenciales, aisladas de los datos y la auditoría de usuarios reales.

### f. Usuarios demo

MesaFlow incluye tipos de usuario demo que se pueden utilizar desde el selector público de demo cuando el login demo está habilitado. Están acotados al restaurante demo y aislados de los datos y la auditoría de usuarios reales.

| Tipo demo | Canal previsto | Módulos disponibles |
| --- | --- | --- |
| Admin | Demo web de staff | Servicio, control horario, menú, cocina, plano de sala, reservas, dashboard de analíticas y administración de usuarios. |
| Encargado | Demo web de staff | Servicio, control horario, menú, cocina, plano de sala, reservas y dashboard de analíticas. |
| Camarero | Demo web de staff | Servicio, control horario, plano de sala y reservas. |
| Cocina | Demo web de staff | Board de cocina y control horario. |
| Developer | Demo técnica web | Área developer con documentación Swagger/API, Storybook, enlaces de arquitectura, relación de tablas de base de datos y logs técnicos/auditoría. |
| Cliente | Demo de app Android | Flujo móvil de mesa: entrada por QR/demo, carta, configuración de productos, pedido, reservas y checkout. |

### Producción

- **Frontend:** https://fullstack-architecture-lab-crao.vercel.app
- **Backend:** https://fullstack-architecture-lab.onrender.com
- **Android:** [Descargar el APK más reciente](https://github.com/Programito/fullstack-architecture-lab/releases/download/v0.1.0/mesaflow-0.1.0.apk) ([notas de la versión](https://github.com/Programito/fullstack-architecture-lab/releases/latest))
- **Health:** https://fullstack-architecture-lab.onrender.com/api/v1/health

La demo de producción utiliza una base de datos gestionada en un plan gratuito. Tras un periodo de inactividad, la primera petición puede necesitar unos segundos de arranque mientras se despiertan la base de datos y la conexión del backend; después, las siguientes peticiones deberían responder con normalidad.

### Mejoras futuras

- **Creación de usuarios:** completar el flujo de alta del personal con invitaciones, asignación de roles y acceso acotado por restaurante.
- **Creación de restaurantes:** añadir un flujo de administración para crear restaurantes, configurar zonas de servicio e inicializar datos listos para demo.
- **Secciones del plano:** permitir varias zonas de servicio, como sala, terraza, barra y reservados, dentro del mismo restaurante.
- **Pasarelas bancarias:** integrar proveedores reales de pago para autorización de tarjeta, estado de liquidación y conciliación de cobros.

### Variables de entorno del backend

```bash
cd backend
cp .env.example .env
```

Variables principales:

```txt
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/proyecto?schema=public"
FRONTEND_ORIGIN="http://localhost:4200"
IDENTITY_MEMORY_SEED=true
```

Con `IDENTITY_MEMORY_SEED=true` el backend arranca sin PostgreSQL usando adaptadores en memoria.

`FRONTEND_ORIGIN` acepta una lista de hosts separados por comas. En producción el frontend y el backend viven en hosts distintos, así que debe incluir el origen del frontend desplegado, y hace falta `AUTH_COOKIE_SECURE=true` para que las cookies de autenticación (`SameSite=None; Secure`) se acepten entre sitios:

```txt
FRONTEND_ORIGIN="http://localhost:4200,https://fullstack-architecture-lab-crao.vercel.app"
AUTH_COOKIE_SECURE=true
```

En local mantén `AUTH_COOKIE_SECURE=false`: las cookies se envían con `SameSite=Lax`, que funciona sobre HTTP plano en localhost.

### Base de datos local

```bash
cd backend
docker compose up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### Comandos útiles

#### Frontend

```bash
pnpm test -- --watch=false   # tests unitarios
pnpm test:e2e                # Playwright
pnpm storybook               # http://localhost:6006
pnpm build
pnpm build-storybook
```

#### Backend

```bash
pnpm test                 # unitarios y aplicación
pnpm test:e2e             # Supertest
pnpm test:integration     # Testcontainers (requiere Docker)
pnpm build
```

### Tests

- **Frontend:** Vitest + Testing Library (componentes) y Playwright (e2e).
- **Backend:** Vitest (unitarios/aplicación), Supertest (e2e) y Testcontainers (integración Prisma).

Ejecuta los comandos desde `frontend/` o `backend/` según corresponda.
