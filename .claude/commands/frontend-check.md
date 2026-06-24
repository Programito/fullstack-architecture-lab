# Frontend Quality Check

Ejecuta la verificación final mínima para el trabajo frontend Angular completado.

Analiza los archivos cambiados y decide qué comandos ejecutar desde `frontend/`:

**Matriz de verificación:**
- Lógica pura o servicio → test enfocado: `pnpm test -- --watch=false <archivo.spec.ts>`
- Componente UI compartido → spec componente + `pnpm build` si cambió API pública
- Story o docs MDX → `pnpm build-storybook`
- Diagrama Mermaid → validador Python
- Ruta o flujo crítico → tests integración + `pnpm test:e2e`
- Cambio i18n → test locale `es` + al menos un locale alternativo
- Cambio tema/color → verificar light y dark

**Checklist final antes de cerrar:**
1. No se revirtieron cambios del usuario no relacionados
2. APIs públicas de componentes siguen tipadas y consistentes
3. Accesibilidad (roles, labels, focus, disabled, error, keyboard) cubierta donde aplica
4. Stories y docs UI coinciden con estados, variantes y tamaños cambiados
5. Traducciones completas para `es`, `en` y `ca` si cambió texto visible

Reporta: comandos ejecutados con resultado, checks omitidos con razón, y cualquier riesgo residual.
