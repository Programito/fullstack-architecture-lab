import type { RestaurantMenuDto, RestaurantOrderDto, ServiceFloorDto, ServicePhaseCourseDto, ServicePointOrderDto } from './restaurant-pos-api.models';
import type { PaymentMethod } from '../models/payment.models';
import type { TableOrderPaymentSummary } from '../models/order.models';
import type { ComboProductDefinition } from '../../menu/models/combo.model';
import type { ModifierGroup } from '../../menu/models/modifier-group.model';
import type { FloorElement, Product, RestaurantTable, TableStatus } from '../models/restaurant-pos.models';

export function formatOpenDuration(value: string | null | undefined): string {
  if (!value) return '0m';
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${elapsedMinutes}m`;
}

export function mapServiceCourse(course: ServicePhaseCourseDto) {
  switch (course) {
    case 'drinks':
      return 'drinks' as const;
    case 'starters':
      return 'starter' as const;
    case 'mains':
      return 'main' as const;
    case 'desserts':
      return 'dessert' as const;
    default:
      return 'other' as const;
  }
}

export function mapServiceTable(
  table: {
    id: string;
    tableNumber: number;
    capacity: number;
    status: TableStatus;
    serviceStartedAt: string | null;
    occupiedAt?: string | null;
  },
  totalCents: number,
  isStool = false,
): RestaurantTable {
  return {
    id: table.id,
    number: table.tableNumber,
    capacity: isStool ? 1 : table.capacity,
    status: table.status,
    total: totalCents / 100,
    openDuration: formatOpenDuration(table.occupiedAt ?? table.serviceStartedAt),
    ...(table.occupiedAt ? { occupiedAt: table.occupiedAt } : {}),
    ...(table.serviceStartedAt ? { serviceStartedAt: table.serviceStartedAt } : {}),
  };
}

export function mapServiceFloor(serviceFloor: ServiceFloorDto): {
  floorId: string;
  floorName: string;
  rows: number;
  columns: number;
  floorElements: FloorElement[];
  restaurantTables: RestaurantTable[];
} {
  return {
    floorId: serviceFloor.floor.id,
    floorName: serviceFloor.floor.name,
    rows: serviceFloor.floor.rows,
    columns: serviceFloor.floor.columns,
    floorElements: serviceFloor.elements.map((element) => ({
      id: element.id,
      type: element.type,
      label: element.label,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      ...(element.tableId ? { tableId: element.tableId } : {}),
      ...(element.shape ? { shape: element.shape } : {}),
    })),
    restaurantTables: serviceFloor.servicePoints.map((servicePoint) => {
      const matchingElement = serviceFloor.elements.find((element) => element.tableId === servicePoint.table.id);
      return mapServiceTable(
        servicePoint.table,
        servicePoint.summary.totalCents,
        matchingElement?.type === 'stool',
      );
    }),
  };
}

export function mapRestaurantMenuToProducts(menu: RestaurantMenuDto): Product[] {
  return menu.sections.flatMap((section) =>
    section.items.map((item) => ({
      id: item.restaurantProductId ?? item.id,
      ...(item.restaurantProductId ? { restaurantProductId: item.restaurantProductId } : {}),
      name: item.name,
      ...(item.description ? { description: item.description } : {}),
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
      categoryId: section.id,
      category: section.name,
      basePrice: item.priceCents / 100,
      price: item.priceCents / 100,
      available: item.isAvailable,
      taxRateName: item.taxRateName ?? null,
      taxRatePercent: item.taxRatePercent ?? null,
      course: (item.defaultCourse ?? 'other') as Product['course'],
      type: item.productType,
      modifierGroupIds: item.modifierGroups.map((g) => g.id),
      preparationPolicy: mapPreparationRoute(item.preparationRoute),
      ...(item.comboDefinition ? { comboDefinitionId: item.comboDefinition.id } : {}),
    })),
  );
}

export function mapRestaurantMenuModifierGroups(menu: RestaurantMenuDto): ModifierGroup[] {
  const seen = new Set<string>();
  return menu.sections.flatMap((section) =>
    section.items.flatMap((item) =>
      item.modifierGroups
        .filter((g) => {
          if (seen.has(g.id)) return false;
          seen.add(g.id);
          return true;
        })
        .map((g) => ({
          id: g.id,
          name: g.name,
          type: g.selectionType as ModifierGroup['type'],
          required: g.isRequired,
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
          options: g.options.map((o) => ({
            id: o.id,
            name: o.name,
            priceDelta: o.priceDeltaCents / 100,
          })),
        })),
    ),
  );
}

export function mapRestaurantMenuComboDefinitions(menu: RestaurantMenuDto): ComboProductDefinition[] {
  return menu.sections.flatMap((section) =>
    section.items
      .filter((item) => item.productType === 'combo' && item.comboDefinition !== null)
      .map((item) => {
        const def = item.comboDefinition!;
        return {
          productId: item.restaurantProductId ?? item.id,
          pricingMode: 'base_plus_supplements' as const,
          slots: def.slots.map((slot) => ({
            id: slot.id,
            name: slot.name,
            required: slot.isRequired,
            minSelections: slot.minSelections,
            maxSelections: slot.maxSelections,
            allowedProductIds: slot.options.map((o) => o.restaurantProductId),
            defaultProductId: slot.options.find((o) => o.isAvailable)?.restaurantProductId,
          })),
          supplements: def.slots.flatMap((slot) =>
            slot.options
              .filter((o) => o.supplementPriceCents > 0)
              .map((o) => ({ slotId: slot.id, productId: o.restaurantProductId, supplementPrice: o.supplementPriceCents / 100 })),
          ),
        };
      }),
  );
}

function mapPreparationRoute(route?: string): Product['preparationPolicy'] {
  switch (route) {
    case 'bar':
      return { route: 'bar', requiresReadyBeforeServe: false };
    case 'direct':
      return { route: 'direct', requiresReadyBeforeServe: false };
    case 'cold_station':
      return { route: 'cold_station', requiresReadyBeforeServe: true };
    case 'dessert_station':
      return { route: 'dessert_station', requiresReadyBeforeServe: true };
    default:
      return { route: 'kitchen', requiresReadyBeforeServe: true };
  }
}

function mapPreparationPolicy(preparationRoute: string): { route: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station'; requiresReadyBeforeServe: boolean } {
  const requiresReady = preparationRoute !== 'direct' && preparationRoute !== 'bar';
  return { route: preparationRoute as 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station', requiresReadyBeforeServe: requiresReady };
}

function mapRestaurantOrderCourse(course: string) {
  switch (course) {
    case 'drinks':
      return 'drinks' as const;
    case 'starter':
      return 'starter' as const;
    case 'main':
      return 'main' as const;
    case 'dessert':
      return 'dessert' as const;
    default:
      return 'other' as const;
  }
}

export function mapServicePointOrder(serviceOrder: ServicePointOrderDto) {
  if (!serviceOrder.order) return null;

  return {
    id: serviceOrder.order.id,
    tableId: serviceOrder.order.tableId,
    tax: serviceOrder.order.taxCents / 100,
    total: serviceOrder.order.totalCents / 100,
    status: serviceOrder.order.status,
    paymentMethod: 'pending' as const,
    clientOrigin: serviceOrder.order.clientOrigin ?? null,
    lines: serviceOrder.lines.map((line) => {
      const unitPrice = line.unitPriceCents / 100;
      const subtotal = line.subtotalCents / 100;
      const course = mapServiceCourse(line.course);
      // El catálogo POS usa restaurantProductId como identidad. productId identifica
      // el producto maestro y no sirve para reconciliar una línea con su artículo de venta.
      const stableProductId = line.restaurantProductId ?? line.productId ?? `service-product:${line.id}`;
      const configurationSignature = line.configurationSignature ?? `service-config:${stableProductId}`;

      return {
        id: line.id,
        productSnapshot: {
          productId: stableProductId,
          productName: line.productName,
          ...(line.imageUrl ? { imageUrl: line.imageUrl } : {}),
          productType: line.productType,
          basePrice: unitPrice,
          course,
          preparationPolicy: mapPreparationPolicy(line.preparationRoute),
        },
        productId: stableProductId,
        productName: line.productName,
        remote: true,
        quantity: line.quantity,
        basePrice: unitPrice,
        selectedModifiers: line.modifiers.map((m) => ({
          groupId: m.groupName,
          groupName: m.groupName,
          optionId: m.optionName,
          name: m.optionName,
          priceDelta: m.priceDeltaCents / 100,
          type: 'single' as const,
        })),
        selectedComboSlots: line.comboSlots.map((s) => ({
          slotId: s.slotName,
          slotName: s.slotName,
          selectedProducts: [{
            productId: s.selectedProductName,
            productName: s.selectedProductName,
            productType: 'simple' as const,
            course: 'other' as const,
            preparationPolicy: { route: 'direct' as const, requiresReadyBeforeServe: false },
            supplementPrice: s.supplementPriceCents / 100,
          }],
        })),
        ...(line.kitchenNote ? { kitchenNote: line.kitchenNote, note: line.kitchenNote } : {}),
        ...(line.taxRateName ? { taxRateName: line.taxRateName } : {}),
        ...(line.taxRatePercent !== undefined && line.taxRatePercent !== null ? { taxRatePercent: line.taxRatePercent } : {}),
        ...(line.taxCents !== undefined ? { tax: line.taxCents / 100 } : {}),
        unitPrice,
        subtotal,
        configurationSignature,
        course,
        status: line.status,
        statusUpdatedAt: line.updatedAt,
      };
    }),
  };
}

export function mapRestaurantOrder(orderResponse: RestaurantOrderDto, paymentMethod: PaymentMethod = 'pending') {
  const payments: TableOrderPaymentSummary[] = orderResponse.payments.map((payment) => ({
    id: payment.id,
    method: payment.method === 'other' ? 'other' : payment.method,
    amount: payment.amountCents / 100,
    status: payment.status,
    paidAt: payment.paidAt,
  }));
  const lastCompletedPayment = [...payments].reverse().find((payment) => payment.status === 'completed') ?? null;
  const status =
    orderResponse.order.status === 'pending_payment'
      ? ('payment_pending' as const)
      : orderResponse.order.status === 'paid'
        ? ('paid' as const)
        : ('open' as const);

  return {
    id: orderResponse.order.id,
    tableId: orderResponse.order.tableId ?? '',
    clientOrigin: orderResponse.order.clientOrigin ?? null,
    tax: orderResponse.order.taxCents / 100,
    paid: orderResponse.order.paidCents / 100,
    balance: orderResponse.order.balanceCents / 100,
    total: orderResponse.order.totalCents / 100,
    status,
    paymentMethod,
    payments,
    lastCompletedPayment,
    lines: orderResponse.lines.map((line) => {
      const unitPrice = line.unitPriceCents / 100;
      const subtotal = line.subtotalCents / 100;
      const course = mapRestaurantOrderCourse(line.course);
      const status = line.cancelledAt ? ('cancelled' as const) : line.status;

      return {
        id: line.id,
        productSnapshot: {
          productId: line.productId ?? line.restaurantProductId ?? `order-product:${line.id}`,
          productName: line.productName,
          ...(line.imageUrl ? { imageUrl: line.imageUrl } : {}),
          productType: line.productType,
          basePrice: line.basePriceCents / 100,
          course,
          preparationPolicy: mapPreparationPolicy(line.preparationRoute),
        },
        productId: line.restaurantProductId ?? line.productId ?? `order-product:${line.id}`,
        productName: line.productName,
        remote: true,
        quantity: line.quantity,
        basePrice: line.basePriceCents / 100,
        selectedModifiers: line.modifiers.map((modifier) => ({
          groupId: modifier.groupName,
          groupName: modifier.groupName,
          optionId: modifier.optionName,
          name: modifier.optionName,
          priceDelta: modifier.priceDeltaCents / 100,
          type: 'single' as const,
        })),
        selectedComboSlots: line.comboSlots.map((slot) => ({
          slotId: slot.slotName,
          slotName: slot.slotName,
          selectedProducts: [{
            productId: slot.selectedProductName,
            productName: slot.selectedProductName,
            productType: 'simple' as const,
            course: 'other' as const,
            preparationPolicy: { route: 'direct' as const, requiresReadyBeforeServe: false },
            supplementPrice: slot.supplementPriceCents / 100,
          }],
        })),
        platterComponents: line.platterComponents.map((component) => ({
          id: component.componentName,
          name: component.componentName,
          removable: true,
          replaceable: component.replacementName !== null,
        })),
        ...(line.kitchenNote ? { kitchenNote: line.kitchenNote, note: line.kitchenNote } : {}),
        ...(line.taxRateName ? { taxRateName: line.taxRateName } : {}),
        ...(line.taxRatePercent !== null ? { taxRatePercent: line.taxRatePercent } : {}),
        tax: line.taxCents / 100,
        unitPrice,
        subtotal,
        configurationSignature: line.configurationSignature,
        course,
        status,
        ...(line.cancelledAt ? { statusUpdatedAt: line.cancelledAt } : {}),
      };
    }),
  };
}
