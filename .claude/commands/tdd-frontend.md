# TDD Frontend Angular

Implementa cambios frontend siguiendo el ciclo rojo-verde-refactor del proyecto.

## Flujo de trabajo

1. **Rojo:** Escribir o actualizar el test enfocado primero. Confirmar que falla por la razón esperada.
2. **Verde:** Implementar el cambio mínimo que satisfaga el test.
3. **Refactor:** Limpiar mientras los tests siguen en verde.
4. **Ampliar:** Cuando el cambio afecte UI compartida, rutas, estado, stories o docs.

Si el primer test pasa antes de implementar, revisar el test — debe probar el comportamiento ausente.

## Contexto de la tarea

$ARGUMENTS

## Directrices Angular

- Componentes standalone, `input()`, `output()`, `model()`, `signal()`, `computed()`
- `inject()` para inyección de dependencias
- Evitar patrones Angular legacy
- Texto visible en español con Transloco (locales: `es`, `en`, `ca`)
- Tokens CSS semánticos `--ui-*` para temas light/dark

## Tests

Escribir tests alrededor de comportamiento visible con Testing Library: roles, labels, texto, ARIA, eventos, transiciones de estado. Usar `provideI18nTesting()` para texto traducido.

## Cierre

Terminar con `/frontend-check` para ejecutar la verificación final mínima.
