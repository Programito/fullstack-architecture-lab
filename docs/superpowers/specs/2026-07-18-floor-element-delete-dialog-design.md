# Diálogo de eliminación de elementos del plano

## Objetivo

Sustituir la confirmación nativa del navegador al eliminar una mesa u otro elemento de `/restaurant-pos/layout` por un diálogo integrado, claro, accesible y responsive.

## Alternativas consideradas

1. **`app-dialog` compartido con resumen visual (seleccionada).** Reutiliza el foco, teclado, backdrop, responsive y tema ya probados. Permite mostrar el elemento exacto antes de eliminarlo.
2. **Modal construido directamente en `FloorPlan`.** Reduce la comunicación entre componentes, pero duplica comportamiento de accesibilidad y mezcla renderizado del plano con persistencia.
3. **Servicio global de confirmación genérico.** Sería reutilizable, pero añade una abstracción nueva para un único caso y limita la presentación específica de mesas.

## Diseño aprobado

`FloorPlan` dejará de usar `window.confirm`. Al pulsar «Eliminar», emitirá el elemento seleccionado a `RestaurantPosLayoutPage`. La página guardará ese elemento como eliminación pendiente y abrirá el componente compartido `app-dialog` en tamaño pequeño.

El diálogo mostrará:

- icono de eliminación dentro de un indicador de peligro;
- título «Eliminar elemento del plano»;
- nombre y tipo traducido del elemento, por ejemplo «M1 · Mesa»;
- para mesas y taburetes, aviso de que el punto de servicio dejará de estar disponible, manteniendo el histórico;
- para elementos decorativos, aviso de que desaparecerán del plano;
- acciones «Cancelar» y «Eliminar», con la acción destructiva en variante `danger`.

## Flujo y estados

1. El usuario selecciona un elemento y pulsa «Eliminar».
2. Se abre el diálogo y el foco entra en sus acciones.
3. «Cancelar», Escape, cerrar o backdrop descartan la selección pendiente sin modificar el plano.
4. «Eliminar» llama al endpoint persistente ya implementado.
5. Mientras la petición está activa, el botón muestra carga y el diálogo no puede cerrarse ni enviarse otra vez.
6. Al responder correctamente, se rehidrata el plano y se cierra el diálogo.
7. Si falla, el diálogo permanece abierto y muestra un mensaje traducido para reintentar.

## Bloqueo de mutaciones del plano

La página mantendrá un único estado de mutación con tres valores: `idle`, `creating` y `deleting`. Tanto la creación como la eliminación consultarán ese estado antes de llamar a la API; si no está en `idle`, ignorarán nuevas confirmaciones. Esto evita llamadas duplicadas incluso aunque dos eventos lleguen antes de que Angular vuelva a renderizar los botones.

Mientras exista una mutación activa:

- un overlay semitransparente cubrirá todo el editor del plano y sus diálogos;
- un `app-spinner` central mostrará «Añadiendo mesa…» o «Eliminando mesa…» según la operación;
- el contenedor expondrá `aria-busy="true"` y el spinner conservará `role="status"` con texto accesible;
- el overlay capturará la interacción del puntero y tendrá una capa superior a las acciones y diálogos;
- no se podrá cerrar ni confirmar de nuevo el diálogo que originó la operación.

Al completar correctamente, la página aplicará la respuesta del backend, cerrará el diálogo correspondiente y volverá a `idle`. Si la API falla, volverá a `idle`, retirará el overlay y mantendrá el formulario o diálogo abierto con un mensaje traducido para permitir el reintento.

## Accesibilidad y responsive

- Se reutilizan `role="dialog"`, `aria-modal`, control de foco, Escape y restauración de foco de `app-dialog`.
- El nombre accesible incluye el título y la descripción.
- No se depende solo del color: icono, título, descripción y etiqueta del botón comunican el peligro.
- En móvil las acciones pueden envolver y el contenido permanece dentro del alto disponible.
- Se usan tokens semánticos del tema para funcionar en claro y oscuro.
- El overlay bloqueante ocupa el viewport disponible sin provocar cambios de tamaño o desplazamientos de contenido.

## Internacionalización

Se añadirán las mismas claves a `es`, `en` y `ca` para título, descripción de mesa, descripción de elemento decorativo, etiquetas de cancelar/eliminar, mensajes de error y estados «Añadiendo mesa…»/«Eliminando mesa…». Los tests de traducción usarán el helper existente.

## Pruebas

- `FloorPlan`: pulsar «Eliminar» emite la solicitud sin usar `window.confirm` ni mutar el store.
- `RestaurantPosLayoutPage`: abre el diálogo con nombre y tipo correctos.
- Cancelar no llama a la API y conserva el elemento.
- Confirmar llama una vez a la API, muestra carga y aplica la respuesta.
- Clics repetidos durante creación o eliminación producen exactamente una llamada HTTP.
- El overlay muestra el texto correcto, bloquea la interacción y expone `aria-busy="true"` durante cada operación.
- Un error conserva el diálogo y muestra el mensaje de reintento.
- Se mantienen verdes las pruebas completas de frontend; el contrato backend no cambia.

## Fuera de alcance

- Deshacer después de eliminar.
- Cambiar el endpoint o la semántica de desactivación de mesas.
- Crear un nuevo servicio global de confirmaciones.
