# TDD Backend NestJS

Implementa cambios backend siguiendo el ciclo rojo-verde-refactor del proyecto.

## Flujo de trabajo

1. **Rojo:** Añadir o actualizar el test más pequeño primero. Confirmar que falla por la razón esperada.
2. **Verde:** Implementar el cambio mínimo backend que satisfaga el comportamiento.
3. **Refactor:** Limpiar mientras el test sigue en verde.
4. **Ampliar:** Cuando el cambio afecte contratos HTTP, guards, persistencia, migraciones o seeds.

## Contexto de la tarea

$ARGUMENTS

## Arquitectura

```txt
src/<feature>/domain/              # entidades, value objects, enums, domain events
src/<feature>/application/        # casos de uso, puertos
src/<feature>/infrastructure/     # persistencia, seguridad, adaptadores
src/<feature>/presentation/rest/  # controladores, guards, DTOs
src/shared/                       # preocupaciones transversales
```

Preferir extender módulo existente antes de crear uno nuevo.

## Nivel de test adecuado

- Dominio puro: spec unitaria junto al fuente
- Caso de uso: spec aplicación con adaptadores in-memory
- Repositorio Prisma: spec integración (Testcontainers, requiere Docker)
- Contrato REST / auth: spec e2e con Supertest

## Notas

- Endpoints bajo `/api/v1`
- Errores alineados con `backend/src/shared/http/application-error.mapper.ts`
- Para cambios Prisma: schema + migración + seeds juntos

## Cierre

Terminar con `/backend-check` para ejecutar la verificación final mínima.
