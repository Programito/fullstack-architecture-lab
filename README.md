# fullstack-architecture-lab

Laboratorio full stack para practicar una arquitectura moderna con frontend Angular y backend NestJS. El proyecto combina una base de interfaz reutilizable, documentacion de componentes, pruebas automatizadas y una API versionada preparada para evolucionar.

## Stack

- **Frontend:** Angular, Tailwind CSS, Transloco, Storybook, Vitest, Testing Library y Playwright.
- **Backend:** NestJS, Prisma, PostgreSQL, Swagger, Vitest, Supertest y Testcontainers.
- **Herramientas:** pnpm, TypeScript y Docker para levantar PostgreSQL cuando sea necesario.

## Estructura

```txt
.
+-- frontend/   # Aplicacion Angular, UI compartida, Storybook y e2e
`-- backend/    # API NestJS, casos de uso, dominio, Prisma y tests
```

## Requisitos

- Node.js compatible con Angular 21 y NestJS 11.
- pnpm 11.2.2 o superior.
- Docker, opcional, para ejecutar PostgreSQL localmente o pruebas de integracion con Testcontainers.

## Instalacion

Instala las dependencias de cada aplicacion por separado:

```bash
cd frontend
pnpm install
```

```bash
cd backend
pnpm install
```

## Ejecucion en desarrollo

### Frontend

```bash
cd frontend
pnpm start
```

La aplicacion estara disponible en:

```txt
http://localhost:4200
```

### Backend

```bash
cd backend
pnpm dev
```

La API estara disponible en:

```txt
http://localhost:3000
```

La documentación interactiva de la API requiere una sesión con rol `developer`:

```txt
http://localhost:3000/developer/api-docs/
```

## Variables de entorno del backend

El backend incluye un archivo de ejemplo en `backend/.env.example`.

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
IDENTITY_MEMORY_SEED_COUNT=10
IDENTITY_MEMORY_SEED_RANDOM=false
IDENTITY_MEMORY_SEED_VALUE=12345
```

El backend puede arrancar con adaptadores en memoria para desarrollo local. PostgreSQL queda preparado para cuando se necesite persistencia con Prisma.

## Base de datos local

Para levantar PostgreSQL con Docker:

```bash
cd backend
docker compose up -d
```

Comandos utiles de Prisma:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:studio
```

## Comandos utiles

### Frontend

```bash
pnpm start
pnpm test -- --watch=false
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
pnpm test:e2e
pnpm test:integration
```

## Storybook

Los componentes reutilizables del frontend viven en:

```txt
frontend/src/app/shared/ui/
```

Para revisar el catalogo visual:

```bash
cd frontend
pnpm storybook
```

Storybook se sirve por defecto en:

```txt
http://localhost:6006
```

## Tests

- **Frontend:** Vitest, Testing Library y Playwright.
- **Backend:** Vitest para unitarios, Supertest para e2e y Testcontainers para integracion.

Ejecuta los comandos desde `frontend/` o `backend/` segun corresponda.
