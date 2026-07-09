# Developer Logs Top Grid Balance Design

## Goal

Refinar la composición superior de `/developer/logs` para que:

- las cards de `Operación` y `Auditoría` mantengan una altura visual consistente
- el bloque superior no deje huecos vacíos al mostrar `Insights` y `KPIs`
- la lectura del dashboard sea más intencional en desktop sin romper tablet y mobile

## Scope

En alcance:

- layout de `developer-logs-page__dashboard-top`
- distribución de `insight-band`
- distribución y orden de `summary-cards`
- pequeños ajustes de altura, alineación y densidad visual

Fuera de alcance:

- cambios de copy
- nuevos KPIs
- nuevos charts
- cambios backend
- rediseño de filtros o tabla

## Approved Direction

Se usará una composición de dos columnas en desktop:

- izquierda: `Insights`
- derecha: `KPIs`

La intención es que ambos bloques ocupen una altura total parecida y que el peso visual quede equilibrado.

En tablet y móvil, la página volverá a una sola columna manteniendo este orden:

1. shortcuts
2. insights
3. kpis

## Insight Column

La columna izquierda mantendrá las 3 cards actuales del insight band.

Decisiones:

- las tres cards tendrán altura uniforme
- el contenido interno tendrá una alineación vertical más estable
- los estados `good` y `bad` seguirán igual, sin introducir nuevos colores o superficies

Objetivo visual:

- que `Operación` y `Auditoría` no “bailen” de tamaño según el texto
- que la columna se lea como un bloque editorial corto y compacto

## KPI Column

La columna derecha usará una rejilla compacta de 2 columnas con una última card ancha:

1. fila 1: `Peticiones` + `Errores`
2. fila 2: `Tasa de error` + `Eventos auditados`
3. fila 3: `Latencia p95` a ancho completo

Razón:

- evita el hueco visual típico de una rejilla de 5 cards
- deja `Latencia p95` como cierre de rendimiento
- mantiene una lectura natural: volumen, fallo, ratio, auditoría y rendimiento

## Layout Rules

En desktop:

- `dashboard-top` pasa a 2 columnas
- la columna izquierda puede ser ligeramente más ancha que la derecha si ayuda al equilibrio visual
- `insight-band` se apila en 3 filas
- `summary-cards` se convierte en una rejilla explícita de 2 columnas
- la última KPI (`Latencia p95`) hace span completo

En tablet:

- la composición puede seguir en una sola columna para evitar compresión innecesaria

En móvil:

- una sola columna
- botones y cards a ancho completo como ahora

## Implementation Notes

Archivos esperados:

- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`

Cambios esperados:

- añadir wrappers/clases semánticas para columna izquierda y derecha
- marcar la KPI de latencia con una clase de span completo
- forzar alturas más uniformes en insight cards
- ajustar gaps y alineación del bloque superior

## Testing

Añadir o actualizar cobertura para confirmar:

- existe una estructura de dos columnas en desktop mediante hooks de clase
- la card de `Latencia p95` ocupa ancho completo dentro del grid de KPIs
- se mantiene el layout compacto ya introducido previamente

Verificación objetivo:

- `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- `pnpm build`

## Risks And Mitigations

### Riesgo: el bloque derecho quede demasiado denso

Mitigación:

- usar una rejilla de 2 columnas clara
- dejar `Latencia p95` a ancho completo para respirar al final

### Riesgo: los insights se vean demasiado altos con poco contenido

Mitigación:

- aplicar altura uniforme moderada, no exagerada
- alinear contenido con un reparto vertical sobrio

### Riesgo: el layout desktop no degrade bien en tablet

Mitigación:

- mantener breakpoint conservador
- volver a una sola columna antes de que las cards se compriman

## Recommendation

Seguir con la composición `Insights izquierda + KPIs derecha`.

Es la opción que mejor:

- equilibra alturas entre bloques
- elimina huecos visuales
- mantiene una lectura lógica del dashboard
- permite mejorar el layout sin rediseñar el producto
