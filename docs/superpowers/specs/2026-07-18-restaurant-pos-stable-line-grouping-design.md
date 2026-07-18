# Agrupación estable de líneas del pedido POS

## Objetivo

Evitar que productos directos idénticos aparezcan duplicados o que los controles de cantidad actúen temporalmente sobre otra línea cuando el usuario añade, incrementa, reduce o elimina con rapidez.

La solución debe conservar el flujo actual de la aplicación móvil: el carrito móvil seguirá agrupando configuraciones idénticas y enviando las mismas peticiones de pedido.

## Causa raíz

El backend ya persiste una `configurationSignature` estable para cada línea, construida a partir del producto de restaurante, modificadores, selecciones de combo, componentes y nota. El endpoint operativo `GET /restaurants/:restaurantId/service-points/:tableId/order` no expone esa firma.

Al mapear dicha respuesta, el frontend sustituye el dato ausente por `service-line:<lineId>`. Dos líneas idénticas reciben firmas distintas y no pueden agruparse. Además, los controles de una fila agrupada emiten el `lineId` de la primera línea; para un producto directo deben modificar la cantidad total deseada del producto y permitir que la sincronización consolide los duplicados.

## Decisión

Se ampliará de forma compatible el contrato del endpoint operativo para incluir `configurationSignature` en cada línea.

El frontend usará esa firma persistida como identidad de configuración. Mantendrá un fallback determinista para respuestas antiguas o adaptadores demo que todavía no proporcionen el campo, sin volver a usar el ID individual como criterio de agrupación cuando exista información suficiente.

No se fusionarán físicamente todas las líneas en el repositorio al leerlas. Los IDs y estados individuales seguirán disponibles para cocina, cancelaciones y trazabilidad. La consolidación de duplicados de productos directos continuará realizándose mediante la cola de escritura del POS.

## Reglas de agrupación visual

Una fila solo puede agrupar líneas cuando todas comparten:

- `restaurantProductId` representado por el `productId` estable del catálogo POS;
- `configurationSignature`;
- precio unitario;
- estado `pending`;
- ausencia de nota de cocina o nota de línea;
- ausencia de modificadores, selecciones de combo y componentes de plato.

Los productos personalizados, combos, platos configurables, líneas con notas, precios diferentes o estados de cocina diferentes permanecerán separados.

La cantidad y el subtotal visibles serán la suma de las líneas equivalentes.

## Controles y sincronización

Para una fila agrupable, `+`, `−` y `Eliminar` comunicarán la identidad estable del producto directo, no un `lineId` arbitrario.

El flujo será:

1. Aplicar inmediatamente el cambio optimista sobre la cantidad total local.
2. Guardar la última cantidad deseada por mesa y producto.
3. Serializar las escrituras del producto.
4. Comparar la cantidad deseada con la suma de todas las líneas equivalentes del backend.
5. Actualizar una línea principal y eliminar las líneas duplicadas sobrantes.
6. Superponer cualquier intención local más reciente sobre respuestas remotas antiguas.

`Eliminar` sobre la fila agrupada elimina todas sus unidades pendientes. Las líneas ya enviadas a cocina o con otro estado no forman parte de esa fila y conservan su flujo de cancelación independiente.

## Backend y compatibilidad móvil

El cambio de backend es aditivo:

- el modelo de vista de la línea de servicio incluirá `configurationSignature`;
- el repositorio Prisma copiará el valor ya almacenado;
- el repositorio demo proporcionará la firma disponible o una firma equivalente estable;
- el DTO REST la expondrá en OpenAPI.

La aplicación móvil no cambiará sus peticiones. Su serializador usa `ignoreUnknownKeys = true`, por lo que acepta el nuevo campo sin modificar sus DTO. Su carrito ya fusiona líneas según producto y selecciones antes de enviar la cantidad al backend.

## Escenarios de aceptación

```gherkin
Feature: Agrupación estable de productos directos en el POS

Scenario: Recargar dos líneas pendientes idénticas
  Given el backend devuelve dos líneas de Vino tinto copa con la misma configuración
  When el POS muestra el pedido
  Then aparece una sola fila con la cantidad total
  And aparece el subtotal agregado

Scenario: Incrementar rápidamente una fila agrupada
  Given el pedido contiene varias líneas backend equivalentes del mismo producto directo
  When el usuario pulsa incrementar varias veces antes de terminar la sincronización
  Then la cantidad visible aumenta de forma optimista en la misma fila
  And la última cantidad deseada se conserva
  And el backend termina con una sola línea activa para esa configuración

Scenario: Mantener configuraciones distintas separadas
  Given existen líneas del mismo producto con notas, modificadores o estados diferentes
  When el POS muestra el pedido
  Then cada configuración o estado aparece en su propia fila

Scenario: Añadir productos desde phone
  Given el cliente móvil agrupa productos idénticos en su carrito
  When envía el pedido al backend actualizado
  Then las peticiones conservan su formato actual
  And el cliente puede leer el estado del pedido aunque la respuesta incluya configurationSignature
```

## Estrategia de pruebas

- Backend: prueba del repositorio/contrato que demuestre que la firma persistida llega al endpoint de mesa.
- Frontend mapper: prueba que demuestre que se conserva la firma del backend y que el fallback es estable.
- Panel Angular: prueba de una única fila para duplicados equivalentes y separación para configuraciones distintas.
- Página/servicio de escritura: prueba de varios incrementos rápidos con duplicados remotos, última cantidad ganadora y consolidación.
- Móvil: ejecutar las pruebas existentes de carrito, mapeo y repositorio de pedidos; no se prevén cambios de producción en `mobile/`.
- Cierre: pruebas enfocadas, suites amplias y builds de las áreas modificadas.

## Fuera de alcance

- Fusionar líneas con estados de cocina diferentes.
- Fusionar configuraciones personalizadas o notas distintas.
- Cambiar la interfaz o el contrato de escritura de la aplicación móvil.
- Añadir una migración de base de datos: la firma ya se persiste.
