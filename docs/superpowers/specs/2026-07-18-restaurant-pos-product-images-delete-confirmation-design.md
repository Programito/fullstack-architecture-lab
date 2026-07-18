# Imágenes y confirmación de borrado en el pedido

## Objetivo

Mejorar la lectura y seguridad del pedido del TPV sin alterar el flujo responsive de phone:

- mostrar la imagen del producto en las líneas del pedido;
- mostrar un skeleton mientras cargan las imágenes del pedido y de «Buscar producto»;
- confirmar el borrado completo cuando una línea agrupada contiene más de una unidad;
- mantener `−` como la acción para reducir unidades individualmente.

## Comportamiento de borrado

- Una línea pendiente con cantidad agrupada igual a `1` se elimina directamente.
- Una línea pendiente con cantidad agrupada mayor que `1` abre un diálogo de confirmación.
- Una línea no pendiente conserva la confirmación existente, con independencia de su cantidad.
- El diálogo representa el grupo visual completo y muestra imagen, nombre y cantidad.
- El texto deja claro que se eliminarán todas las unidades. No ofrece la opción de eliminar una unidad.
- Confirmar emite el ID de la línea primaria del grupo y reutiliza la lógica existente, que elimina únicamente el grupo equivalente.
- Cancelar o cerrar no modifica el pedido y limpia el producto pendiente de confirmación.

## Imágenes de producto

Se añadirá un componente reutilizable dentro de la funcionalidad `restaurant-pos` para renderizar imágenes de producto en:

1. la línea agrupada del pedido;
2. cada resultado de «Buscar producto»;
3. el diálogo de confirmación de borrado.

El componente:

- reserva desde el primer render el tamaño final para evitar saltos de layout;
- muestra `app-skeleton` hasta recibir el evento `load`;
- revela la imagen cargada sin cambiar sus dimensiones;
- muestra un icono de imagen si la URL no existe o falla;
- usa texto alternativo cuando la imagen aporta contexto y queda decorativo cuando el nombre ya está inmediatamente disponible;
- respeta `prefers-reduced-motion` mediante el skeleton compartido.

El pedido usará una miniatura cuadrada. El buscador conservará su avatar circular actual. El diálogo usará una imagen más grande, pero el mismo componente y los mismos estados.

## Contrato y datos

- `OrderLineProductSnapshot` incorporará `imageUrl?: string`.
- Las líneas locales copiarán la URL desde el producto del catálogo al crear su snapshot.
- La respuesta backend del pedido expondrá `imageUrl: string | null`.
- Prisma obtendrá la URL actual a través de la relación del producto; no se añadirá una columna snapshot ni una migración.
- El adaptador demo y los mappers frontend conservarán el campo opcional.
- Si un backend antiguo no envía el campo, la interfaz mostrará el fallback sin romper la carga del pedido.

## Responsive y accesibilidad

- La miniatura no reducirá el ancho mínimo de los controles de cantidad ni del botón «Eliminar».
- En phone, la imagen, el nombre y el precio se mantendrán dentro de la tarjeta sin scroll horizontal.
- El diálogo reutilizará `app-dialog`, con foco, cierre por Escape y botones accesibles ya proporcionados por el componente compartido.
- Los skeletons decorativos no generarán anuncios repetitivos para lectores de pantalla.
- Los textos nuevos se añadirán en español, inglés y catalán.

## Pruebas

El cambio se desarrollará con TDD y cubrirá:

- diálogo al eliminar un grupo pendiente con cantidad mayor que `1`;
- borrado directo de una sola unidad pendiente;
- confirmación existente para líneas no pendientes;
- imagen, nombre y cantidad dentro del diálogo;
- skeleton visible antes de `load` y oculto después;
- fallback al producirse `error` o faltar URL;
- skeleton tanto en pedido como en buscador;
- propagación de `imageUrl` en snapshot local, mapper remoto, adaptadores y DTO backend;
- verificación enfocada, suite frontend completa, builds y pruebas backend afectadas.

## Fuera de alcance

- Cambiar la semántica de los botones `+` y `−`.
- Persistir una copia histórica de la imagen en `OrderLine`.
- Rediseñar el diálogo compartido o el buscador completo.
- Modificar la aplicación Android: se verificará que el campo aditivo siga siendo compatible.
