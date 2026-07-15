# Servicio De Sala Command Center Y Workflow-First

**Objetivo**

Replantear la pantalla `Servicio de sala` para que se perciba como una consola moderna, limpia y tecnologica, mejorando la claridad visual y la jerarquia operativa sin perder la rapidez de uso del equipo de sala.

**Decision de alcance**

- El trabajo se concentra en la experiencia de `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/`.
- La prioridad es mejorar composicion, jerarquia, flujo y percepcion visual del servicio de sala.
- Se mantiene la logica funcional base de mesas, pedido, cocina, cobro y cierre.
- No se plantea en esta fase un cambio de routing ni de contratos backend.
- Se admite reorganizar el layout actual si eso mejora de forma clara la experiencia.

**Preferencias aprobadas**

- Prioridad principal: `claridad visual y aspecto mas premium`.
- Direccion visual: `TPV moderno, limpio y tecnologico`.
- Enfoque de producto aprobado: mezcla de `command center` y `workflow-first`.

## Estado actual

- La page actual divide la pantalla en `plano de sala` a la izquierda y `panel de mesa` a la derecha.
- El header superior ya muestra resumen de turno y acceso rapido a cocina.
- El panel lateral mezcla informacion de estado, pedido, cocina, cobro y cierre dentro de una misma superficie, con muchas cajas internas.
- La seleccion de producto vive en un dialogo independiente que funciona, pero compite mentalmente con el panel de mesa.
- La base funcional es valida, pero visualmente la pantalla se siente mas cercana a un panel utilitario que a una consola premium.

## Enfoque recomendado

Convertir `Servicio de sala` en una consola operativa de tres capas:

1. `Barra superior de control` con metricas y filtros compactos.
2. `Canvas central de sala` como protagonista visual y navegador principal.
3. `Panel lateral workflow-first` para la mesa seleccionada, organizado por fases.

Ademas, la seleccion de producto pasa a una `capa de trabajo temporal` en forma de drawer ancho o superposicion lateral, en lugar de convivir permanentemente en el panel principal.

## Alternativas consideradas

### Opcion A: Pulido visual sobre la estructura actual

Mantener `plano izquierda + panel derecha` casi intacto y mejorar colores, espaciado y tipografia.

**Ventajas**

- Menor coste de implementacion.
- Menor riesgo de cambio para usuarios actuales.

**Inconvenientes**

- La percepcion premium mejora, pero no cambia el modelo mental.
- El panel lateral seguiria mezclando demasiadas capas de accion.
- La experiencia correria el riesgo de sentirse como un restyling y no como una mejora real.

### Opcion B: Split-view premium

Refinar la estructura de dos columnas, manteniendo el panel lateral pero con mejor jerarquia y menos ruido.

**Ventajas**

- Mejora clara sin alterar demasiado el flujo.
- Facil de introducir de forma incremental.

**Inconvenientes**

- Puede quedarse corta para la ambicion `moderno, limpio y tecnologico`.
- No explota del todo el potencial del plano de sala como canvas principal.

### Opcion C: Command center + workflow-first

Reorganizar la pantalla alrededor del estado global de sala y del flujo operativo de cada mesa.

**Ventajas**

- Salto de percepcion fuerte.
- Hace mas clara la siguiente accion.
- Se alinea mejor con una experiencia de TPV contemporanea.

**Inconvenientes**

- Requiere rehacer parte de la estructura visual.
- Exige validar bien el balance entre novedad y eficiencia operativa.

**Recomendacion**

Elegir esta opcion.

## Diseno funcional

### 1. Barra superior de control

La franja superior debe comportarse como un panel de lectura rapida, no como un bloque de tarjetas grandes.

**Contenido**

- mesas activas
- tickets esperando cocina
- mesas listas para cobrar
- ventas del turno
- acceso a cocina
- busqueda global de mesa o taburete
- filtros rapidos por estado cuando aporten valor

**Criterio visual**

- densidad alta pero legible
- metricas compactas
- menos protagonismo de cajas individuales
- apariencia de dashboard operativo elegante

**Objetivo**

Permitir entender el estado general de sala en dos segundos.

### 2. Canvas central de sala

El plano de sala debe convertirse en el protagonista visual y en el navegador principal de la pantalla.

**Comportamiento**

- mas aire alrededor del plano
- mejor contraste entre fondo, mesas y estados
- seleccion de mesa muy visible
- lectura minima de estado directamente en cada mesa

**Informacion que una mesa debe comunicar sin abrir panel**

- nombre o numero
- estado
- nivel de urgencia
- senal opcional de total o progreso si cabe sin ruido

**Objetivo**

Que navegar la sala sea visual, no textual.

### 3. Panel lateral workflow-first

El panel de mesa ya no debe mezclar todo con el mismo peso visual. Debe organizarse por fases operativas:

1. `Resumen`
2. `Pedido`
3. `Cocina`
4. `Cobro`
5. `Cierre`

Cada fase debe contener una accion principal claramente dominante y acciones secundarias subordinadas.

**Regla**

La UI debe reforzar la pregunta: `que toca hacer ahora en esta mesa`.

### 4. Fase de resumen

Debe ser una cabecera compacta y muy legible.

**Datos prioritarios**

- estado
- tiempo de ocupacion o servicio
- comensales
- total

**Decision**

El resumen largo tipo texto continuo pasa a un segundo plano o se reduce al minimo.

### 5. Fase de pedido

Esta fase debe centrarse en leer rapidamente el pedido y ampliar lineas sin ruido.

**Cambios recomendados**

- CTA principal visible: `Anadir producto`
- lineas con menos cajas internas
- cantidad, nombre y precio siempre alineados igual
- notas, modificadores y componentes visibles solo cuando existan
- agrupacion por curso solo si ayuda de verdad a la lectura

**Objetivo**

Que el pedido se sienta como una lista operativa limpia, no como una pila de tarjetas.

### 6. Fase de cocina

La cocina debe presentarse como estado de flujo, no solo como dos botones sueltos.

**Contenido**

- cuantos platos faltan por enviar
- cuantos estan en preparacion
- cuantos estan listos para servir
- accion principal contextual: `Enviar a cocina` o `Marcar servido`

**Objetivo**

Dar contexto operativo antes de pulsar una accion.

### 7. Fase de cobro

Cuando la mesa este cerca de terminar, el cobro debe ganar protagonismo real.

**Contenido**

- total destacado
- selector claro de metodo de pago
- CTA dominante con el importe

**Ejemplo**

- `Cobrar 58,40 EUR`

**Objetivo**

Evitar que la accion de cobro compita con demasiadas acciones paralelas.

### 8. Fase de cierre

Las acciones de limpieza y liberacion deben quedar visibles, pero con un peso visual inferior al de pedido o cobro.

**Contenido**

- pasar a limpieza
- liberar mesa

**Objetivo**

Reservar la intensidad visual para las acciones que mueven el servicio.

### 9. Seleccion de producto

La seleccion de producto no debe quedarse fija dentro del panel lateral.

**Patron recomendado**

- abrir un drawer lateral ancho o una capa tipo command palette comercial
- mantener visible el contexto de mesa
- permitir alta rapida y configuracion sin cambiar de ruta

**Estructura**

- buscador dominante
- tabs o filtros compactos por uso real
- favoritos y mas vendidos primero
- cards o filas compactas con nombre, precio, badges discretos y CTA rapido `+`
- personalizacion en segundo nivel sin perder contexto

**Objetivo**

Separar `gestion de mesa` de `exploracion de catalogo`.

## Diseno visual

### Direccion estetica

La experiencia debe sentirse como un `TPV moderno, limpio y tecnologico`, no como un ERP con colores nuevos.

### Paleta

Base:

- `slate`
- `zinc`
- `cyan`

Acentos:

- `amber` para atencion
- `red` solo para riesgo o acciones destructivas

**Regla**

Reducir el multicolor funcional y usar un sistema mas sobrio y consistente.

### Superficies y bordes

- menos tarjetas dentro de tarjetas
- mas uso de contraste de superficie
- bordes sutiles
- separadores ligeros

### Tipografia

- mayor contraste entre titulos, estados, cifras y copy auxiliar
- numeros y estados especialmente legibles
- tono tecnico y preciso

### Motion

- seleccion de mesa
- apertura de drawer
- cambio de fase o accion prioritaria

Las animaciones deben ser cortas y funcionales, nunca decorativas.

## Diseno tecnico

### Archivos implicados

- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html`
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts`
- `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`
- `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`
- `frontend/src/app/features/restaurant-pos/components/product-search-dialog/`
- `frontend/src/app/features/restaurant-pos/components/floor-plan/`
- estilos compartidos de la feature o de UI si el rediseño necesita tokens reutilizables de superficies, estados o drawer

### Estrategia de implementacion

1. Rehacer primero la composicion general de la page.
2. Reordenar despues el panel lateral por fases operativas.
3. Convertir la seleccion de producto en drawer o patron equivalente.
4. Pulir por ultimo estados, microinteracciones y lectura del plano.

### Logica existente a reutilizar

- `app-floor-plan` como base del canvas de sala
- `app-service-table-panel` como contenedor funcional del detalle de mesa
- `app-product-search-dialog` y customizers como base para el flujo de alta de producto
- `store.selectedServiceInfo()`, `store.kitchenQueue()`, `store.salesToday()`, `store.servicePoints()` y estados derivados actuales
- `nextAction`, `servicePhase`, `pendingKitchenCount` y demas senales ya calculadas para no mover la complejidad al template

### Posibles ajustes de view model

Puede compensar derivar nuevas senales calculadas para simplificar la presentacion:

- `serviceDashboardStats()`
- `selectedServiceWorkflowSections()`
- `servicePointVisualState()`
- `productPickerMode()`
- `productQuickSections()`

Estas derivadas no cambian contratos backend y ayudan a que el template no concentre demasiada logica visual.

## Riesgos

- Sobredisenar la pantalla y perjudicar la rapidez operativa.
- Dar demasiado protagonismo al plano y quitar claridad al panel de mesa.
- Introducir un drawer de producto demasiado pesado en mobile.
- Mantener demasiada UI heredada dentro del nuevo layout y perder consistencia.

## Testing

### Tests prioritarios

- `restaurant-pos-service-page.spec.ts`
  - mantiene seleccion de mesa y actualizacion del panel contextual
  - refleja correctamente la jerarquia de acciones por fase
  - abre la seleccion de producto en el nuevo patron visual
  - no rompe flujos de cocina, cobro ni cierre
- `service-table-panel.spec.ts`
  - valida nueva organizacion por fases
  - mantiene notas, cantidades y acciones de linea
  - conserva accesibilidad basica y labels
- tests del selector de producto si cambia el patron de overlay

### Riesgos a cubrir

- regresiones responsive entre desktop y tablet
- perdida de visibilidad de acciones primarias
- degradacion de accesibilidad por exceso de capas visuales
- confusion entre estados de mesa si solo cambia el color

## Criterios de exito

- El estado global de sala se entiende casi de un vistazo.
- La mesa seleccionada deja claro el siguiente paso operativo.
- El panel lateral se siente mas limpio y menos fragmentado.
- Anadir productos resulta rapido sin invadir la lectura principal de la mesa.
- La pantalla transmite una sensacion mas premium, tecnologica y deliberada sin perder velocidad de uso.
