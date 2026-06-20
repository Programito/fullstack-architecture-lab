# AGENTS.md

## Alcance

Estas instrucciones aplican al backend NestJS de esta carpeta.

Usa el `AGENTS.md` de la raíz para reglas generales del repositorio. Usa este archivo al cambiar
módulos backend, controladores REST, DTOs, guards, casos de uso, repositorios Prisma, seeds o tests
de backend.

## Fuentes Oficiales Primero

Cuando haga falta información externa, prioriza documentación oficial:

- NestJS: `docs.nestjs.com`
- Prisma: `prisma.io/docs`
- Vitest: `vitest.dev`
- Supertest: `github.com/ladjs/supertest`
- Testcontainers: `testcontainers.com`

Prefiere los patrones locales del proyecto sobre ejemplos genéricos cuando el código ya muestre una
convención clara.

## Flujo TDD

Usa un ciclo red-green-refactor para cambios backend:

1. Escribe o actualiza primero el test enfocado.
2. Ejecuta el test enfocado y confirma que falla por el motivo esperado.
3. Implementa el cambio útil más pequeño.
4. Ejecuta el test enfocado hasta que pase.
5. Refactoriza solo después de cubrir el comportamiento.
6. Ejecuta una verificación más amplia cuando cambie wiring HTTP, persistencia o contratos públicos.

Si un test pasa antes de que exista la implementación, revísalo hasta que pruebe el comportamiento
que falta.

## Arquitectura

Mantén la división actual:

- `src/<feature>/domain/`: entidades, value objects, enums y eventos de dominio
- `src/<feature>/application/`: casos de uso y puertos
- `src/<feature>/infrastructure/`: persistencia, seguridad y adaptadores
- `src/<feature>/presentation/rest/`: controladores, guards y DTOs
- `src/shared/`: piezas transversales

Extiende módulos existentes antes de crear nuevas abstracciones o capas.

## Persistencia

- Trata `prisma/schema.prisma` y las migraciones committeadas como fuente de verdad.
- Mantén los seeds en `prisma/seeds/` y usa `prisma/seed.ts` como punto de entrada.
- Mantén alineado el comportamiento entre adapters en memoria y Prisma cuando implementan el mismo puerto.
- Añade tests de integración cuando cambien queries, relaciones o mapeos Prisma.

## API

- Mantén endpoints bajo `/api/v1`.
- Mantén DTOs, guards y mapeo de respuestas alineados con el contrato público.
- Revisa cookies, sesiones y autorización a nivel de e2e cuando cambie auth o acceso a `/developer/*`.

## Tests

Prefiere:

- Tests enfocados de lógica pura y casos de uso con adapters en memoria
- Tests de integración para repositorios Prisma
- Tests e2e para rutas, guards, cookies y wiring HTTP

## Skills Locales

Las copias locales de skills backend viven en:

```txt
backend/.codex/skills/
```

Manténlas sincronizadas con las versiones compartidas en:

```txt
.codex/skills/
```

## Comandos

Ejecuta comandos desde `backend/`:

- `pnpm build`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `pnpm prisma:deploy`
- `pnpm prisma:seed`

Los tests de integración usan Testcontainers y requieren Docker.
