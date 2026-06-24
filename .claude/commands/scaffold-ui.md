# Scaffold UI Component

Crea un nuevo componente UI compartido en `frontend/src/app/shared/ui/<component>/` siguiendo las convenciones del proyecto.

## Orden de trabajo

1. Inspeccionar componentes UI compartidos similares cercanos en `frontend/src/app/shared/ui/`.
2. Escribir el spec enfocado primero para el comportamiento visible ausente.
3. Crear los archivos en la carpeta estándar con nombre en kebab-case:
   - `<component>.ts`
   - `<component>.html`
   - `<component>.css`
   - `<component>.stories.ts`
   - `<component>.spec.ts`
4. Implementar la API mínima y template que satisfaga el test.
5. Añadir stories para: `Default`, `Disabled`, `Error`, `Sizes`, `Variants`, y estados especiales que apliquen.
6. Actualizar `frontend/src/app/shared/ui/docs/*.mdx` si el componente añade o cambia una convención.
7. Cerrar con `/frontend-check`.

## API pública

- Variantes: `primary`, `secondary`, `neutral`, `danger`, `violet`
- Tamaños: `sm`, `md`, `lg`
- Apariencias: `default`, `minimal`
- Usar `model()` para valores controlados con two-way binding
- Preferir `input()`, `output()`, `signal()`, `computed()`

## Tests

Cubrir comportamiento visible: roles, labels, texto, nombres accesibles, atributos ARIA, eventos, model updates, estados disabled/error/loading, comportamiento keyboard. Usar `provideI18nTesting()` para texto traducido.

## Nombre del componente a crear

$ARGUMENTS
