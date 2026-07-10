# Introduccion De Alergenos En La Pagina De Menu

**Objetivo**

Introducir los alergenos del enum `Allergen` del backend en la experiencia actual de `menu` del frontend, de forma que sean visibles, filtrables y consistentes en toda la gestion de productos sin crear una entrada nueva en la navegacion lateral del POS.

**Decision de alcance**

- No se crea una nueva seccion en `frontend/src/app/features/restaurant-pos/restaurant-pos.routes.ts`.
- El trabajo se concentra en la pagina existente `frontend/src/app/features/menu/pages/menu-page/`.
- Se reutilizan los tipos, traducciones y campos ya presentes en el frontend.

**Estado actual**

- El backend ya define `Allergen` en `backend/prisma/schema.prisma`.
- El frontend ya tiene un espejo del enum en `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`.
- El dominio de menu ya expone `Allergen` en `frontend/src/app/features/menu/models/product.model.ts`.
- El formulario de producto ya permite seleccionar alergenos en `frontend/src/app/features/menu/components/product-form-dialog/`.
- La pagina `menu` ya usa los alergenos para busqueda libre, pero no parece tenerlos aun como filtro y señal visible de primer nivel en el listado.

## Enfoque recomendado

Usar la pagina actual de `menu` como punto unico de gestion de alergenos:

1. Mostrar alergenos de forma visible en tarjetas y detalle de producto.
2. Añadir filtros especificos por alergenos en la cabecera de revision/filtrado.
3. Mantener un catalogo canonico de valores y etiquetas traducidas para no duplicar listas hardcodeadas.

Este enfoque encaja con la arquitectura actual, minimiza cambios en routing y permisos, y aprovecha que el formulario y las traducciones ya existen.

## Alternativas consideradas

### Opcion A: Solo busqueda por texto

Seguir apoyandose en `productSearchText()` para que el usuario escriba "gluten", "milk", etc.

**Ventajas**

- Casi sin cambios de UI.

**Inconvenientes**

- Poco descubrible.
- No sirve bien para revisiones rapidas de carta.
- Depende del idioma y del texto introducido.

### Opcion B: Nueva entrada lateral "Alergenos"

Crear una seccion nueva en el menu lateral del POS.

**Ventajas**

- Da protagonismo al tema.

**Inconvenientes**

- Separa la gestion de alergenos de la gestion real del producto.
- Añade routing, permisos, copy e IA de navegacion sin necesidad clara.
- Rompe el modelo mental actual donde toda la ficha del plato vive en `menu`.

### Opcion C: Integracion en la pagina actual de Menu

Exponer alergenos como parte de la ficha del producto y como filtro de la vista.

**Ventajas**

- Mejor cohesion funcional.
- Menor coste tecnico.
- Mejor experiencia para operativa y mantenimiento.

**Recomendacion**

Elegir esta opcion.

## Diseño funcional

### 1. Fuente canonica de alergenos

Crear una unica fuente de verdad en frontend para la lista ordenada de alergenos del enum.

**Propuesta**

- Extraer la lista de valores de `ALLERGEN_VALUES` fuera de `product-form-dialog.ts`.
- Ubicarla en un archivo compartido de `features/menu`, por ejemplo:
  - `frontend/src/app/features/menu/models/allergen.model.ts`
  - o `frontend/src/app/features/menu/constants/allergens.ts`

**Responsabilidad**

- Exportar `ALLERGEN_VALUES`.
- Exportar helpers de ordenado y, si compensa, un tipo reutilizable.
- Evitar que haya varias listas manuales repartidas entre formulario, pagina y tests.

### 2. Visibilidad en la pagina de Menu

Los alergenos deben verse de forma explicita en la UI principal de `menu`.

**Zonas a tocar**

- Tarjetas de producto en `menu-page.html`.
- Vista compacta si existe un resumen distinto.
- Panel de detalle lateral o modal del producto seleccionado.

**Comportamiento**

- Si un producto tiene alergenos, mostrar chips o texto corto con etiquetas traducidas.
- Si no tiene alergenos declarados, mantener una salida clara y discreta, por ejemplo usando la traduccion existente tipo `noAllergens` donde proceda.
- No saturar la tarjeta: mostrar un numero limitado y, si hay muchos, resumir con `+N`.

### 3. Filtro especifico por alergenos

La pagina `menu` debe permitir filtrar el listado por uno o varios alergenos.

**Comportamiento recomendado**

- Añadir un filtro multiseleccion en la barra de filtros de `menu-page`.
- Permitir seleccionar varios alergenos.
- La logica de filtrado debe ser inclusiva: si el producto contiene cualquiera de los alergenos seleccionados, aparece.

**Motivo**

Es la opcion mas util para operativa diaria y revisiones de carta.

**Detalles**

- El filtro debe convivir con `query`, `categoryFilter`, `availabilityFilter`, `customizationFilter`, `auditFilter` y `reviewFilters`.
- Al cambiar el filtro, debe reutilizarse el mismo patron actual de reset de seleccion cuando aplique.
- El filtro debe usar etiquetas traducidas, no las claves internas del enum.

### 4. Traducciones e i18n

El proyecto ya tiene entradas de traduccion para alergenos en `frontend/src/app/shared/i18n/i18n-testing.ts`.

**Trabajo esperado**

- Reutilizar `menu.allergen.<key>`.
- Añadir solo el copy nuevo de UI que falte para:
  - etiqueta del filtro
  - placeholder o texto de ayuda
  - estado vacio del filtro

## Diseño tecnico

### Archivos probablemente implicados

- `frontend/src/app/features/menu/models/product.model.ts`
- `frontend/src/app/features/menu/pages/menu-page/menu-page.ts`
- `frontend/src/app/features/menu/pages/menu-page/menu-page.html`
- `frontend/src/app/features/menu/components/product-form-dialog/product-form-dialog.ts`
- `frontend/src/app/shared/i18n/i18n-testing.ts`

### Flujo de datos

1. La API ya entrega `allergens` en `RestaurantProductSummaryDto` y `RestaurantProductDetailDto`.
2. El mapeo actual ya los coloca en `Product`.
3. `MenuPage` debe transformar esas claves en:
   - texto visible para render
   - criterio de filtro
4. `ProductFormDialog` debe pasar a consumir la fuente comun de alergenos para no duplicar la lista.

### Regla de filtrado

Si `selectedAllergenFilters` esta vacio, no filtra.

Si contiene valores, un producto pasa el filtro cuando:

- `product.allergens` existe
- y al menos uno de sus valores coincide con alguno de los filtros activos

## Testing

### Tests unitarios / de componente prioritarios

- `menu-page.spec.ts`
  - renderiza alergenos visibles en productos con declaracion
  - permite filtrar por un alergeno
  - permite filtrar por varios alergenos
  - no rompe otros filtros existentes
- `product-form-dialog.spec.ts`
  - sigue mostrando todas las opciones de alergenos desde la fuente comun
- tests del nuevo helper/modelo compartido
  - exporta exactamente los 14 valores esperados

### Riesgos a cubrir

- Divergencia entre la lista usada por formulario y la usada por pagina.
- Filtrado usando labels traducidas en vez de claves internas.
- UI demasiado cargada en mobile si se renderizan todos los chips sin limite.

## Criterios de exito

- Los 14 alergenos del backend tienen representacion unica y consistente en frontend.
- En la pagina `menu`, los alergenos se ven sin entrar a editar el producto.
- El usuario puede filtrar productos por uno o varios alergenos.
- No se crea una nueva entrada lateral en el POS.
- Los textos visibles siguen el sistema de traducciones existente.
