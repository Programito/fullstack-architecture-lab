# Arquitectura Frontend

Este documento describe la estructura frontend preferida para la aplicación Angular.

## Objetivos

- Mantener las funcionalidades fáciles de probar y modificar.
- Preferir APIs modernas de Angular y estado compatible con signals.
- Mantener componentes UI compartidos consistentes, accesibles y documentados.
- Usar textos amables, formales y directos en la interfaz.

## Estructura General

```mermaid
flowchart TB
  App["Aplicación Angular"]
  Routes["Rutas y pantallas"]
  Features["Componentes de funcionalidad"]
  SharedUI["Componentes UI compartidos"]
  SharedServices["Servicios y utilidades compartidas"]
  Backend["Backend API"]

  App --> Routes
  Routes --> Features
  Features --> SharedUI
  Features --> SharedServices
  SharedServices --> Backend
```

## Dirección De Componentes

Prefiere componentes standalone con APIs públicas tipadas:

- Inputs con `input()`.
- Outputs con `output()`.
- Estado local con `signal()`.
- Estado derivado con `computed()`.
- Efectos secundarios con `effect()` solo cuando sean necesarios.

```mermaid
flowchart LR
  Input["Inputs tipados"] --> State["Signals"]
  State --> Derived["Valores computed"]
  Derived --> Template["Template accesible"]
  Template --> Output["Outputs tipados"]
```

## Shared UI

Los componentes reutilizables viven en `frontend/src/app/shared/ui/<component>/` y mantienen juntos
implementación, tests e historias de Storybook.

Usa nombres comunes para variantes y tamaños cuando sea posible:

- Variants: `primary`, `secondary`, `neutral`, `danger`, `violet`.
- Sizes: `sm`, `md`, `lg`.

## Features Y Modelos De Dominio

Cada feature debe mantener sus contratos cerca del código que los consume. Cuando un modelo empiece
a mezclar varios conceptos, divídelo por dominio y conserva un barrel para no hacer incómodos los
imports.

Ejemplo recomendado:

```txt
features/<feature>/models/
  floor-plan.models.ts
  order.models.ts
  payment.models.ts
  product.models.ts
  service.models.ts
  table.models.ts
  <feature>.models.ts
```

El fichero `<feature>.models.ts` puede reexportar los modelos especializados:

```ts
export * from './order.models';
export * from './product.models';
export * from './service.models';
```

Esto permite imports estables desde la feature y evita que un único fichero de modelos se convierta
en un cajón de tipos sin frontera clara.

Como regla práctica:

- Los tipos de plano, mesa, pedido, producto y pago deben vivir en ficheros distintos si cambian por
  motivos diferentes.
- Los modelos de servicio pueden componer tipos de otros dominios, pero no deberían duplicarlos.
- Las pages y stores pueden importar desde el barrel de la feature cuando la comodidad compense.
- Los componentes muy acotados pueden importar el modelo concreto si mejora la legibilidad.

## Estado De Feature

Mantén el estado de pantalla y los filtros de flujo en pages o stores. Los componentes de feature
deben recibir estado por `input()` y comunicar acciones por `output()` siempre que sea razonable.

En diálogos y paneles, evita esconder estado de negocio dentro del componente. Por ejemplo, una
búsqueda de productos puede renderizar el `query`, la vista activa, la categoría y los favoritos que
recibe, pero la page o el store deberían decidir qué productos se muestran y cómo se persisten esos
favoritos.

## Módulo Menu V1

El catálogo del POS vive en `frontend/src/app/features/menu/` y queda separado del snapshot de
pedido. El menú define categorías, productos, disponibilidad y modificadores actuales; cada
`OrderLine` guarda una copia de lo elegido en el momento de añadir el producto: nombre, precio base,
modificadores seleccionados, nota de cocina, precio unitario, subtotal y `configurationSignature`.

Estructura actual:

```txt
features/menu/
  components/product-customizer-dialog/
  models/
    combo.model.ts
    menu-category.model.ts
    modifier-group.model.ts
    modifier-option.model.ts
    product-customization.model.ts
    product.model.ts
    selected-modifier.model.ts
    menu.models.ts
  pages/menu-page/
  services/
    menu-mock.service.ts
    menu-pricing.service.ts
    menu-validation.service.ts
```

Reglas de frontera:

- `MenuMockService` expone el catálogo mock para POS y la vista `/restaurant-pos/menu`.
- `MenuPricingService` resuelve grupos, construye modificadores seleccionados, calcula precios y
  crea `configurationSignature`.
- `MenuValidationService` valida disponibilidad, opciones válidas, grupos requeridos, selección
  única y máximos.
- `RestaurantPosStore` crea y conserva el snapshot de `OrderLine`; las pantallas no recalculan el
  precio de una línea ya creada.
- Los modelos de combos existen solo como contrato futuro; no tienen UI ni lógica funcional en V1.

```mermaid
flowchart LR
  MenuCatalog["MenuMockService<br/>Catalogo actual"] --> MenuPage["/restaurant-pos/menu<br/>Revision de catalogo"]
  MenuCatalog --> ProductSearch["ProductSearchDialog"]
  ProductSearch --> Customizer["ProductCustomizerDialog"]
  Customizer --> Pricing["MenuPricingService<br/>precio + firma"]
  Customizer --> Validation["MenuValidationService<br/>reglas de seleccion"]
  Pricing --> Store["RestaurantPosStore"]
  Validation --> Store
  Store --> OrderLine["OrderLine snapshot<br/>nombre + precio + modificadores + nota"]
  OrderLine --> ServicePanel["ServiceTablePanel"]
  OrderLine --> Kitchen["Vista cocina"]
```

El flujo operativo queda así:

1. La persona abre búsqueda de producto o revisa el catálogo en `Menú`.
2. Un producto simple se añade directo con `addProductToSelectedTable(productId)`.
3. Un producto con modificadores abre `ProductCustomizerDialog`.
4. Confirmar usa `addCustomizedProductToSelectedTable(productId, selectedModifierOptionIds, kitchenNote?)`.
5. La store mergea líneas con la misma `configurationSignature`; distintas notas o modificadores
   generan líneas separadas.
6. Servicio y cocina leen el snapshot de `OrderLine`, mostrando extras, `SIN ...` y nota de cocina
   sin depender de cambios posteriores del catálogo.

## Documentación

Usa esta carpeta para arquitectura frontend, estrategia de testing y notas técnicas del producto.
Usa `frontend/src/app/shared/ui/docs/` para documentación MDX de Storybook sobre el sistema UI.
