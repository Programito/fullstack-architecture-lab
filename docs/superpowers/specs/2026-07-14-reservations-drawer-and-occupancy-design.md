# Drawer Guiado Y Lectura De Ocupacion Para Reservas

**Objetivo**

Mejorar la experiencia de la ruta de reservas del frontend para que el equipo pueda crear reservas con menos friccion y entender mejor la ocupacion del servicio sin perder el contexto de la agenda del dia.

**Decision de alcance**

- El trabajo se concentra en `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/`.
- La prioridad es sustituir el dialogo actual de creacion por un drawer guiado en desktop.
- La vista principal de reservas se mantiene, pero se refuerza con senales visuales de ocupacion.
- No se plantea en esta fase una reescritura completa del flujo ni cambios de routing.

**Estado actual**

- La pagina ya muestra resumen diario, filtros, grupos por servicio y acciones operativas sobre cada reserva.
- La creacion de reserva vive en un `app-dialog` grande dentro de `restaurant-pos-reservations-page.html`.
- El formulario ya dispone de datos valiosos para una experiencia guiada:
  - busqueda de clientes
  - historial de no-shows
  - franjas de servicio
  - slots de hora
  - listado de mesas y capacidad
  - warning por capacidad excedida
- La pagina actual funciona, pero la creacion se siente como un formulario plano y la lectura de ocupacion todavia depende demasiado de inspeccionar tarjetas y filtros.

## Enfoque recomendado

Adoptar un enfoque en dos capas dentro de la misma ruta:

1. Reemplazar el dialogo de creacion por un drawer guiado, progresivo y contextual.
2. Reforzar la vista principal con indicadores operativos de ocupacion y tension del servicio.

Este enfoque aprovecha casi toda la logica ya existente, reduce errores en alta de reserva y mejora la lectura del estado del dia sin introducir una arquitectura nueva.

## Alternativas consideradas

### Opcion A: Mejorar el dialogo actual

Mantener `app-dialog` y solo reorganizar campos, estilos y jerarquia visual.

**Ventajas**

- Menor coste de implementacion.
- Reutiliza casi toda la estructura actual.

**Inconvenientes**

- Sigue ocultando demasiado el contexto de agenda.
- Escala peor si se anaden sugerencias de hora, mesa y ocupacion.
- Mantiene la sensacion de formulario administrativo en lugar de herramienta operativa.

### Opcion B: Drawer guiado con agenda visible

Sustituir el modal por un panel lateral ancho en desktop y una variante fullscreen o sheet en mobile.

**Ventajas**

- Mantiene el contexto de agenda visible.
- Permite secuenciar mejor las decisiones.
- Encaja mejor con ayudas contextuales y resumen sticky.

**Inconvenientes**

- Requiere rehacer parte de la estructura visual del flujo de creacion.
- Exige revisar el comportamiento responsive del patron.

**Recomendacion**

Elegir esta opcion.

## Diseno funcional

### 1. Patron principal de creacion

La accion `Nueva reserva` debe abrir un drawer lateral en desktop en lugar del dialogo actual.

**Comportamiento**

- `Desktop`: drawer derecho ancho con la agenda todavia visible en segundo plano.
- `Mobile`: variante fullscreen o bottom sheet, segun las capacidades del componente base.
- El footer del drawer permanece fijo con el CTA principal y un resumen vivo de la reserva.

**Motivo**

El staff necesita seguir viendo el dia operativo mientras crea la reserva. El patron drawer reduce el cambio de contexto.

### 2. Flujo guiado dentro del drawer

El contenido del drawer se organiza por bloques progresivos, no por una lista plana de inputs.

**Secuencia**

1. `Cliente`
2. `Detalles`
3. `Hora`
4. `Mesa`
5. `Notas y confirmacion`

**Regla**

Todos los bloques siguen visibles, pero la jerarquia visual y los mensajes deben indicar claramente que decision toca a continuacion.

### 3. Bloque de cliente

El bloque de cliente debe ganar protagonismo inicial.

**Comportamiento**

- Input de busqueda arriba con resultados mas ricos.
- Cada resultado muestra nombre, telefono, visitas y no-shows si aplica.
- Al seleccionar cliente, el bloque se compacta a una tarjeta resumen.
- Si el cliente tiene historial de no-show, se muestra una alerta pequena y visible bajo el resumen.

**Objetivo**

Reducir errores de identificacion y hacer mas evidente el riesgo antes de crear la reserva.

### 4. Bloque de detalles

Agrupar `partySize`, `durationMinutes` y telefono en una franja compacta de accion rapida.

**Comportamiento recomendado**

- Inputs grandes y legibles.
- Presets rapidos para tamanos de grupo comunes.
- Validaciones visibles junto al campo si falta informacion minima.

### 5. Bloque de hora

La seleccion de hora debe dejar de ser una rejilla plana de slots.

**Comportamiento recomendado**

- Primero se elige servicio o franja.
- Despues se muestran `horas recomendadas` arriba.
- El resto de horas disponibles aparece debajo en una seccion secundaria.
- Las horas pueden llevar estados visuales como:
  - recomendada
  - alta ocupacion
  - proxima al inicio
  - seleccionada

**Objetivo**

Ayudar a decidir rapido y hacer mas visible la tension del servicio.

### 6. Bloque de mesa

La seleccion de mesas debe pasar de checkboxes planos a opciones con mas informacion visual.

**Comportamiento recomendado**

- Mostrar primero `mesas sugeridas` segun encaje de capacidad.
- Mantener debajo una seleccion manual completa.
- Cada opcion debe comunicar:
  - nombre de mesa
  - capacidad
  - encaje ideal o capacidad justa
  - combinacion de varias mesas cuando aplique

**Importante**

Debe seguir siendo posible crear reserva sin mesa asignada si el flujo actual lo permite.

### 7. Resumen sticky y CTA guiado

El footer del drawer debe resumir la reserva en construccion.

**Contenido**

- fecha
- hora
- pax
- mesa o estado sin asignar
- senal de capacidad

**Comportamiento**

- El CTA principal cambia su texto segun el estado del formulario.
- Ejemplos:
  - `Selecciona una hora`
  - `Selecciona una mesa o continua sin asignar`
  - `Crear reserva`

Esto convierte el envio en una guia, no solo en una validacion final.

### 8. Refuerzo de la vista principal de ocupacion

Sin romper la pagina actual, la vista principal debe transmitir mejor la carga del dia.

**Mejoras propuestas**

- Anadir indicadores mas visibles para:
  - reservas sin mesa
  - reservas proximas
  - reservas vencidas
  - tramos con mas densidad
- Dar mas peso visual a la dimension temporal dentro de las tarjetas.
- Destacar visualmente los grupos de servicio cuando uno este mucho mas cargado que el otro.
- Explorar una banda o resumen rapido de ocupacion por servicio encima de las listas.

**Objetivo**

Que la pregunta "como va el servicio de hoy" pueda responderse casi de un vistazo.

## Diseno tecnico

### Archivos probablemente implicados

- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html`
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css`
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts`
- componentes compartidos de overlay si hace falta soportar un patron drawer reutilizable

### Estrategia de implementacion

1. Mantener la logica de estado existente de `creationOpen`, `creationForm`, clientes, mesas y slots.
2. Cambiar primero la estructura visual del flujo de creacion.
3. Despues enriquecer la semantica visual de slots, mesas y resumen.
4. Por ultimo, mejorar la lectura de ocupacion en la pagina principal.

### Logica existente a reutilizar

- `serviceTabOptions()` y `activeSlots()` para el bloque de hora.
- `availableTables()` y `selectedTablesCapacity()` para el bloque de mesa y resumen.
- `capacityWarningDescription()` para warnings contextuales.
- `selectedCustomer()`, `customerSearchResults()` y `customerSearchLoading()` para el bloque de cliente.
- `summary()`, `highlightFilter()` y `serviceGroups()` para la lectura principal del dia.

### Posibles ajustes de modelo de vista

Puede compensar derivar nuevas senales calculadas para simplificar el template:

- `recommendedSlots()`
- `secondarySlots()`
- `suggestedTables()`
- `manualTables()`
- `creationProgressState()`
- `serviceLoadSummary()`

Estas derivadas no cambian contratos de API y ayudan a evitar que el template concentre demasiada logica de presentacion.

## Testing

### Tests prioritarios

- `restaurant-pos-reservations-page.spec.ts`
  - abre el drawer de creacion desde la CTA principal
  - muestra el bloque de cliente y resultados enriquecidos
  - actualiza el resumen sticky al cambiar hora, pax y mesas
  - muestra warnings de capacidad de forma contextual
  - mantiene la posibilidad de crear sin mesa si ese flujo sigue permitido
  - no rompe filtros ni acciones operativas existentes

### Riesgos a cubrir

- Regresiones responsive al sustituir dialog por drawer
- exceso de complejidad visual en mobile
- duplicacion de logica entre sugerencias y lista manual de mesas
- mezcla confusa entre warning informativo y error bloqueante

## Criterios de exito

- Crear una reserva requiere menos carga visual y menos interpretacion por parte del usuario.
- El contexto de agenda sigue visible durante la creacion en desktop.
- Hora y mesa se convierten en decisiones guiadas, no en listas planas.
- Los warnings de no-show y capacidad aparecen antes del envio final.
- La vista principal transmite mejor la ocupacion del servicio y las incidencias del dia.
