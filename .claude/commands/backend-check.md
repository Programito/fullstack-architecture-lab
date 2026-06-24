# Backend Quality Check

Ejecuta la verificación final mínima para el trabajo backend NestJS completado.

Analiza los archivos cambiados y decide qué comandos ejecutar desde `backend/`:

**Matriz de verificación:**
- Dominio puro o helper → spec unitaria/aplicación enfocada
- Caso de uso con adaptadores in-memory → spec enfocada, luego `pnpm test` si es compartido
- Controlador, guard, cookie, flujo auth → spec e2e + `pnpm test:e2e`
- Repositorio Prisma, relación, transacción → `pnpm test:integration`
- Schema, migración o seed → comando Prisma relevante + tests integración
- Cambio de cableado de módulo → `pnpm build` + nivel de test más relevante

**Checklist final antes de cerrar:**
1. No se revirtieron cambios del usuario no relacionados
2. Cableado de providers del módulo coincide con el adaptador y tokens de puerto previstos
3. DTOs, controladores y mappers de respuesta coinciden con el contrato API público
4. Adaptadores in-memory y Prisma se mantienen alineados donde implementan el mismo puerto
5. Seeds y migraciones reflejan los mismos supuestos de datos

Reporta: comandos ejecutados con resultado, checks omitidos con razón.
