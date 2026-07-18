# Orden estable de líneas en pedidos de restaurante

## Problema

La consulta de detalle del punto de servicio ordena las líneas del pedido por
`updatedAt`. Cambiar la cantidad con `+` o `-` actualiza ese valor y desplaza la
línea en pantalla, aunque el producto siga ocupando la misma posición lógica.

## Comportamiento acordado

- Los grupos de productos se muestran según el momento en que se añadió su
  primera línea al pedido.
- Incrementar o reducir una cantidad no cambia la posición visual del grupo.
- Recargar o reconciliar el pedido con el backend conserva el mismo orden.
- Las líneas con la misma fecha de creación se desempatan por `id`, de modo que
  el resultado siempre sea determinista.
- El comportamiento de agrupación existente y el flujo phone no cambian.

## Diseño

El backend será la fuente de verdad del orden. Las relaciones `lines` de las
consultas que alimentan el pedido se ordenarán por:

1. `createdAt ASC`
2. `id ASC`

Angular conservará el orden recibido al construir los grupos, como ya hace, sin
mantener un segundo registro de posiciones en memoria. No se añade `sortOrder`
al esquema porque no existe un requisito de reordenación manual y una migración
sería complejidad innecesaria.

## Pruebas

- Una prueba de repositorio verificará el criterio compuesto de la consulta del
  punto de servicio.
- Las pruebas enfocadas del pedido comprobarán que agrupación y cambios de
  cantidad siguen funcionando.
- Se ejecutarán las verificaciones ampliadas de frontend y backend en proporción
  a los archivos modificados.

## Criterios de aceptación

```gherkin
Scenario: Cambiar la cantidad sin mover el producto
  Given un pedido con varios productos en un orden visible
  When el usuario incrementa o reduce la cantidad de un producto intermedio
  Then todos los productos conservan su posición relativa
  And la cantidad y el total se actualizan correctamente
```
