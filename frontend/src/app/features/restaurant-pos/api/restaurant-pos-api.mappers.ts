import type { ServiceFloorDto, ServicePhaseCourseDto, ServicePointOrderDto } from './restaurant-pos-api.models';
import type { FloorElement, RestaurantTable, TableStatus } from '../models/restaurant-pos.models';

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

export function mapServicePointOrder(serviceOrder: ServicePointOrderDto) {
  if (!serviceOrder.order) return null;

  return {
    tableId: serviceOrder.order.tableId,
    total: serviceOrder.order.totalCents / 100,
    status: serviceOrder.order.status,
    paymentMethod: 'pending' as const,
    lines: serviceOrder.lines.map((line) => {
      const unitPrice = line.unitPriceCents / 100;
      const subtotal = line.subtotalCents / 100;
      const course = mapServiceCourse(line.course);
      const preparationRoute = course === 'drinks' ? ('bar' as const) : ('kitchen' as const);

      return {
        id: line.id,
        productSnapshot: {
          productId: `service-product:${line.id}`,
          productName: line.productName,
          productType: 'simple' as const,
          basePrice: unitPrice,
          course,
          preparationPolicy: {
            route: preparationRoute,
            requiresReadyBeforeServe: course !== 'drinks',
          },
        },
        productId: `service-product:${line.id}`,
        productName: line.productName,
        quantity: line.quantity,
        basePrice: unitPrice,
        selectedModifiers: [],
        ...(line.kitchenNote ? { kitchenNote: line.kitchenNote, note: line.kitchenNote } : {}),
        unitPrice,
        subtotal,
        configurationSignature: `service-line:${line.id}`,
        course,
        status: line.status,
      };
    }),
  };
}
