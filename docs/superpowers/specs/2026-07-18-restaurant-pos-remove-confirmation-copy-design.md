# Texto de confirmación al eliminar productos del pedido

## Problema

El botón de confirmación usa «Sí, quitar el plato». El pedido también contiene
bebidas y otros tipos de producto, y el mismo diálogo sirve para operaciones con
efectos distintos.

## Comportamiento acordado

- Al eliminar un grupo pendiente con varias unidades, el botón muestra «Sí,
  eliminar todas las unidades».
- Al retirar un producto enviado a cocina o servido, el botón muestra «Sí,
  cancelar el producto», porque la línea queda registrada como cancelada.
- Los textos equivalentes se mantienen en español, inglés y catalán.
- No cambia la acción ejecutada ni el flujo phone; solo se hace explícito su
  efecto en cada variante del diálogo.

## Diseño

El componente seleccionará una clave de traducción distinta con la misma
condición que ya usa para elegir el título y la descripción del diálogo. La
variante agrupada tendrá una clave propia y la variante no pendiente conservará
la clave existente con redacción genérica.

## Pruebas

Una prueba de componente abrirá cada variante y comprobará el nombre accesible
del botón de confirmación. También se verificarán los tres idiomas soportados.

## Criterios de aceptación

```gherkin
Scenario: Eliminar un producto pendiente agrupado
  Given un producto pendiente con varias unidades
  When el usuario abre la confirmación de eliminación
  Then el botón confirma que eliminará todas las unidades

Scenario: Cancelar un producto que ya salió de pendientes
  Given un producto enviado a cocina o servido
  When el usuario abre la confirmación de eliminación
  Then el botón confirma que cancelará el producto
```
