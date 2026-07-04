# MesaFlow POS

[English](#english) · [Español](#español)

## English

Full-stack restaurant POS. Signal-first Angular frontend and NestJS backend with clean architecture.

### Stack

- **Frontend:** Angular 21 (standalone, signals), Tailwind CSS, Transloco (es/en/ca), Storybook, Vitest, Testing Library and Playwright.
- **Backend:** NestJS 11, Prisma, PostgreSQL, Swagger, Vitest, Supertest and Testcontainers.
- **Tooling:** pnpm, TypeScript and Docker.

### Structure

```txt
.
+-- frontend/   # Angular, shared UI, Storybook and e2e
`-- backend/    # NestJS, clean architecture, Prisma and tests
```

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for app-specific setup and commands.

### Implemented features

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
- **Observability and audit:** technical logs, business audit trail and `/developer/logs` dashboard (`developer` role), with Sentry as an env-flag-enabled complement.
- **Realtime orders:** WebSocket invalidations with polling fallback, feature-flagged.
- **Product images:** signed upload from the menu admin, with external storage.
- **Demo accounts:** public access without credentials, isolated from real users' data and audit trail.

### Requirements

- Node.js 20 or higher.
- pnpm 11.2.2 or higher.
- Docker (optional) for local PostgreSQL and Testcontainers integration tests.

### Installation

```bash
cd frontend && pnpm install
cd backend  && pnpm install
```

### Running in development

#### Frontend

```bash
cd frontend
pnpm start
# http://localhost:4200
```

#### Backend

```bash
cd backend
pnpm dev
# http://localhost:3000
# Docs (requires developer role): http://localhost:3000/developer/api-docs/
```

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

TPV full-stack de restaurante. Frontend Angular con arquitectura signal-first y backend NestJS con arquitectura limpia.

### Stack

- **Frontend:** Angular 21 (standalone, signals), Tailwind CSS, Transloco (es/en/ca), Storybook, Vitest, Testing Library y Playwright.
- **Backend:** NestJS 11, Prisma, PostgreSQL, Swagger, Vitest, Supertest y Testcontainers.
- **Herramientas:** pnpm, TypeScript y Docker.

### Estructura

```txt
.
+-- frontend/   # Angular, UI compartida, Storybook y e2e
`-- backend/    # NestJS, arquitectura limpia, Prisma y tests
```

Consulta [frontend/README.md](frontend/README.md) y [backend/README.md](backend/README.md) para la configuración y comandos específicos de cada app.

### Funcionalidades implementadas

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
- **Observabilidad y auditoría:** logs técnicos, auditoría de negocio y dashboard `/developer/logs` (rol `developer`), con Sentry como complemento activable por variable de entorno.
- **Realtime de pedidos:** invalidaciones por WebSocket con fallback a polling, feature-flagged.
- **Imágenes de producto:** subida firmada desde el admin de menú, con almacenamiento externo.
- **Cuentas demo:** acceso público sin credenciales, aisladas de los datos y la auditoría de usuarios reales.

### Requisitos

- Node.js 20 o superior.
- pnpm 11.2.2 o superior.
- Docker (opcional) para PostgreSQL local y tests de integración con Testcontainers.

### Instalación

```bash
cd frontend && pnpm install
cd backend  && pnpm install
```

### Ejecución en desarrollo

#### Frontend

```bash
cd frontend
pnpm start
# http://localhost:4200
```

#### Backend

```bash
cd backend
pnpm dev
# http://localhost:3000
# Docs (requiere rol developer): http://localhost:3000/developer/api-docs/
```

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
