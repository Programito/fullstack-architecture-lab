import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import { DemoRestaurantReadRepository } from '../demo-restaurant-read.repository';
import type { RestaurantFloors, RestaurantMenu, RestaurantReservation, RestaurantSummary } from '../../domain/restaurant-read.models';
import { deriveServicePhase, getServiceDurationMinutes } from '../../domain/service-phase';
import type {
  ServiceFloorView,
  ServiceOrderLineStatus,
  ServiceOrderStatus,
  ServicePhaseCourse,
  ServicePointDetailView,
  ServicePointOrderView,
  ServiceTableStatus,
} from '../../domain/service-floor.models';

@Injectable()
export class PrismaRestaurantReadRepository extends DemoRestaurantReadRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async listRestaurants(): Promise<RestaurantSummary[]> {
    if (!this.shouldUsePrisma()) {
      return super.listRestaurants();
    }

    try {
      const restaurants = await this.prisma.restaurant.findMany({
        orderBy: { name: 'asc' },
      });

      return restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        displayName: restaurant.displayName,
        timezone: restaurant.timezone,
        currency: restaurant.currency,
        isActive: restaurant.isActive,
      }));
    } catch (error: unknown) {
      if (this.shouldFallbackToDemo(error)) {
        return super.listRestaurants();
      }
      throw error;
    }
  }

  override async listReservationsByRestaurantId(
    restaurantId: string,
    date?: string,
  ): Promise<RestaurantReservation[] | null> {
    if (!this.shouldUsePrisma()) {
      return super.listReservationsByRestaurantId(restaurantId, date);
    }

    try {
      const reservations = await this.prisma.reservation.findMany({
        where: {
          restaurantId,
          ...(date
            ? {
                reservationAt: {
                  gte: new Date(`${date}T00:00:00.000Z`),
                  lt: new Date(`${date}T23:59:59.999Z`),
                },
              }
            : {}),
        },
        include: {
          tables: {
            include: {
              table: true,
            },
          },
        },
        orderBy: { reservationAt: 'asc' },
      });

      return reservations.map((reservation) => ({
        id: reservation.id,
        customerId: reservation.customerId,
        customerNameSnapshot: reservation.customerNameSnapshot,
        customerPhoneSnapshot: reservation.customerPhoneSnapshot,
        partySize: reservation.partySize,
        reservationAt: reservation.reservationAt.toISOString(),
        durationMinutes: reservation.durationMinutes,
        status: reservation.status,
        notes: reservation.notes,
        tableIds: reservation.tables.map(({ tableId }) => tableId),
        tables: reservation.tables.map(({ table }) => ({
          id: table.id,
          tableNumber: table.tableNumber,
          name: table.name,
        })),
      }));
    } catch (error: unknown) {
      if (this.shouldFallbackToDemo(error)) {
        return super.listReservationsByRestaurantId(restaurantId, date);
      }
      throw error;
    }
  }

  override async findMenuByRestaurantId(restaurantId: string): Promise<RestaurantMenu | null> {
    if (!this.shouldUsePrisma()) {
      return super.findMenuByRestaurantId(restaurantId);
    }

    try {
      const menu = await this.prisma.restaurantMenu.findFirst({
        where: { restaurantId, isActive: true },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: {
              items: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  restaurantProduct: {
                    include: {
                      product: {
                        include: {
                          comboDefinition: {
                            include: {
                              slots: {
                                orderBy: { sortOrder: 'asc' },
                                include: {
                                  options: {
                                    orderBy: { sortOrder: 'asc' },
                                    include: {
                                      restaurantProduct: { include: { product: true } },
                                    },
                                  },
                                },
                              },
                            },
                          },
                          platterDefinition: {
                            include: { components: { orderBy: { sortOrder: 'asc' } } },
                          },
                        },
                      },
                      modifierGroups: {
                        orderBy: { sortOrder: 'asc' },
                        include: {
                          modifierGroup: {
                            include: { options: { orderBy: { sortOrder: 'asc' } } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!menu) {
        return null;
      }

      return {
        id: menu.id,
        restaurantId: menu.restaurantId,
        name: menu.name,
        isActive: menu.isActive,
        sections: menu.sections.map((section) => ({
          id: section.id,
          name: section.name,
          sortOrder: section.sortOrder,
          isVisible: section.isVisible,
          items: section.items.map((item) => ({
            id: item.id,
            restaurantProductId: item.restaurantProduct.id,
            productId: item.restaurantProduct.product.id,
            name:
              item.displayNameOverride ??
              item.restaurantProduct.displayName ??
              item.restaurantProduct.product.name,
            description: item.restaurantProduct.product.description ?? undefined,
            productType: item.restaurantProduct.product.productType as 'simple' | 'combo' | 'platter',
            priceCents: item.priceOverrideCents ?? item.restaurantProduct.priceCents,
            currency: item.restaurantProduct.currency,
            isAvailable: item.restaurantProduct.isAvailable && item.isVisible,
            defaultCourse: (item.restaurantProduct.product.defaultCourse ?? 'other') as
              | 'drinks'
              | 'starter'
              | 'main'
              | 'dessert'
              | 'other',
            preparationRoute: (item.restaurantProduct.product.defaultPreparationRoute ?? 'direct') as
              | 'direct'
              | 'bar'
              | 'kitchen'
              | 'cold_station'
              | 'dessert_station',
            modifierGroups: item.restaurantProduct.modifierGroups.map(({ modifierGroup }) => ({
              id: modifierGroup.id,
              name: modifierGroup.name,
              selectionType: (modifierGroup.selectionType === 'single' ? 'single' : 'multiple') as 'single' | 'multiple',
              minSelections: modifierGroup.minSelections,
              maxSelections: modifierGroup.maxSelections,
              isRequired: modifierGroup.isRequired,
              options: modifierGroup.options.map((option) => ({
                id: option.id,
                name: option.name,
                priceDeltaCents: option.priceDeltaCents,
                isAvailable: option.isAvailable,
              })),
            })),
            comboDefinition: item.restaurantProduct.product.comboDefinition
              ? {
                  id: item.restaurantProduct.product.comboDefinition.id,
                  slots: item.restaurantProduct.product.comboDefinition.slots.map((slot) => ({
                    id: slot.id,
                    name: slot.name,
                    minSelections: slot.minSelections,
                    maxSelections: slot.maxSelections,
                    isRequired: slot.isRequired,
                    options: slot.options.map((option) => ({
                      id: option.id,
                      restaurantProductId: option.restaurantProductId,
                      name: option.restaurantProduct.displayName ?? option.restaurantProduct.product.name,
                      supplementPriceCents: option.supplementPriceCents,
                      isAvailable: option.isAvailable,
                    })),
                  })),
                }
              : null,
            platterComponents: item.restaurantProduct.product.platterDefinition
              ? item.restaurantProduct.product.platterDefinition.components.map((component) => ({
                  id: component.id,
                  name: component.name,
                  removable: component.isRemovable,
                  replaceable: component.isReplaceable,
                  sortOrder: component.sortOrder,
                }))
              : [],
          })),
        })),
      };
    } catch (error: unknown) {
      if (this.shouldFallbackToDemo(error)) {
        return super.findMenuByRestaurantId(restaurantId);
      }
      throw error;
    }
  }

  override async findFloorsByRestaurantId(restaurantId: string): Promise<RestaurantFloors | null> {
    if (!this.shouldUsePrisma()) {
      return super.findFloorsByRestaurantId(restaurantId);
    }

    try {
      const [restaurant, floors, tables] = await Promise.all([
        this.prisma.restaurant.findUnique({
          where: { id: restaurantId },
          select: { id: true },
        }),
        this.prisma.restaurantFloor.findMany({
          where: { restaurantId },
          orderBy: { createdAt: 'asc' },
          include: {
            elements: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        }),
        this.prisma.restaurantTable.findMany({
          where: { restaurantId },
          orderBy: { tableNumber: 'asc' },
        }),
      ]);

      if (!restaurant) {
        return null;
      }

      return {
        restaurantId,
        tables: tables.map((table) => ({
          id: table.id,
          tableNumber: table.tableNumber,
          name: table.name,
          capacity: table.capacity,
          isActive: table.isActive,
        })),
        floors: floors.map((floor) => ({
          id: floor.id,
          name: floor.name,
          rows: floor.rows,
          columns: floor.columns,
          elements: floor.elements.map((element) => ({
            id: element.id,
            type: element.type as 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool',
            label: element.label,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            tableId: element.tableId,
            shape: element.shape as 'round' | 'square' | 'rectangle' | 'long' | null,
            sortOrder: element.sortOrder,
          })),
        })),
      };
    } catch (error: unknown) {
      if (this.shouldFallbackToDemo(error)) {
        return super.findFloorsByRestaurantId(restaurantId);
      }
      throw error;
    }
  }

  override async findServiceFloorByRestaurantId(restaurantId: string): Promise<ServiceFloorView | null> {
    if (!this.shouldUsePrisma()) {
      return super.findServiceFloorByRestaurantId(restaurantId);
    }

    try {
      const [floors, activeOrders] = await Promise.all([
        this.findFloorsByRestaurantId(restaurantId),
        this.findActiveOrdersByRestaurantId(restaurantId),
      ]);

      if (!floors) {
        return null;
      }

      const floor = floors.floors[0];
      if (!floor) {
        return null;
      }

      const servicePoints: ServiceFloorView['servicePoints'] = floors.tables
        .map((table) => {
          const floorElement = floor.elements.find((element) => element.tableId === table.id);
          if (!floorElement) {
            return null;
          }

          const activeOrder = activeOrders.find((order) => order.tableId === table.id) ?? null;
          const summary = this.createPrismaServiceSummary(activeOrder, table.capacity);

          return {
            table: {
              id: table.id,
              tableNumber: table.tableNumber,
              name: table.name,
              capacity: table.capacity,
              status: this.mapTableStatus(activeOrder),
              serviceStartedAt: activeOrder?.createdAt.toISOString() ?? null,
            },
            summary,
          };
        })
        .filter((servicePoint): servicePoint is ServiceFloorView['servicePoints'][number] => servicePoint !== null);

      return {
        restaurantId,
        floor: {
          id: floor.id,
          name: floor.name,
          rows: floor.rows,
          columns: floor.columns,
        },
        elements: floor.elements.map((element) => ({
          id: element.id,
          type: element.type,
          label: element.label,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          shape: element.shape,
          tableId: element.tableId,
        })),
        servicePoints,
        totals: {
          servicePointCount: servicePoints.length,
          occupiedCount: servicePoints.filter((servicePoint) => this.isPrismaOccupiedStatus(servicePoint.table.status)).length,
          openOrderCount: servicePoints.filter((servicePoint) => activeOrders.some((order) => order.tableId === servicePoint.table.id)).length,
        },
      };
    } catch (error: unknown) {
      if (this.shouldFallbackToDemo(error)) {
        return super.findServiceFloorByRestaurantId(restaurantId);
      }
      throw error;
    }
  }

  override async findServicePointByRestaurantId(
    restaurantId: string,
    tableId: string,
  ): Promise<ServicePointDetailView | null> {
    if (!this.shouldUsePrisma()) {
      return super.findServicePointByRestaurantId(restaurantId, tableId);
    }

    try {
      const [floors, activeOrders] = await Promise.all([
        this.findFloorsByRestaurantId(restaurantId),
        this.findActiveOrdersByRestaurantId(restaurantId),
      ]);

      if (!floors) {
        return null;
      }

      const table = floors.tables.find((candidate) => candidate.id === tableId);
      if (!table) {
        return null;
      }

      const floor = floors.floors[0];
      const floorElement = floor?.elements.find((element) => element.tableId === tableId) ?? null;
      const activeOrder = activeOrders.find((order) => order.tableId === tableId) ?? null;
      const occupiedAt = activeOrder?.createdAt.toISOString() ?? null;
      const serviceStartedAt = activeOrder?.createdAt.toISOString() ?? null;

      return {
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          name: table.name,
          capacity: table.capacity,
          status: this.mapTableStatus(activeOrder),
          occupiedAt,
          serviceStartedAt,
        },
        floorElement: floorElement
          ? {
              id: floorElement.id,
              label: floorElement.label,
              type: floorElement.type,
              x: floorElement.x,
              y: floorElement.y,
              width: floorElement.width,
              height: floorElement.height,
              shape: floorElement.shape,
            }
          : null,
        serviceInfo: {
          ...this.createPrismaServiceSummary(activeOrder, table.capacity),
          durationMinutes: getServiceDurationMinutes(occupiedAt, serviceStartedAt, new Date('2026-06-21T12:34:00.000Z')),
        },
      };
    } catch (error: unknown) {
      if (this.shouldFallbackToDemo(error)) {
        return super.findServicePointByRestaurantId(restaurantId, tableId);
      }
      throw error;
    }
  }

  override async findServicePointOrderByRestaurantId(
    restaurantId: string,
    tableId: string,
  ): Promise<ServicePointOrderView | null> {
    if (!this.shouldUsePrisma()) {
      return super.findServicePointOrderByRestaurantId(restaurantId, tableId);
    }

    try {
      const [floors, activeOrders] = await Promise.all([
        this.findFloorsByRestaurantId(restaurantId),
        this.findActiveOrdersByRestaurantId(restaurantId),
      ]);

      if (!floors || !floors.tables.some((candidate) => candidate.id === tableId)) {
        return null;
      }

      const activeOrder = activeOrders.find((order) => order.tableId === tableId) ?? null;
      if (!activeOrder) {
        return { order: null, lines: [] };
      }

      return {
        order: {
          id: activeOrder.id,
          tableId: activeOrder.tableId ?? tableId,
          status: this.mapServiceOrderStatus(activeOrder.status),
          openedAt: activeOrder.createdAt.toISOString(),
          updatedAt: activeOrder.updatedAt.toISOString(),
          subtotalCents: activeOrder.subtotalCents,
          taxCents: activeOrder.taxCents,
          totalCents: activeOrder.totalCents,
          currency: activeOrder.currency,
        },
        lines: activeOrder.lines.map((line) => ({
          id: line.id,
          productName: line.productNameSnapshot,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          subtotalCents: line.subtotalCents,
          status: line.status as ServiceOrderLineStatus,
          course: this.mapServiceCourse(line.courseSnapshot),
          kitchenNote: line.kitchenNote,
          updatedAt: line.updatedAt.toISOString(),
        })),
      };
    } catch (error: unknown) {
      if (this.shouldFallbackToDemo(error)) {
        return super.findServicePointOrderByRestaurantId(restaurantId, tableId);
      }
      throw error;
    }
  }

  private shouldUsePrisma(): boolean {
    return Boolean(process.env.DATABASE_URL);
  }

  private shouldFallbackToDemo(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientInitializationError;
  }

  private async findActiveOrdersByRestaurantId(restaurantId: string) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['open', 'pending_payment'] },
        tableId: { not: null },
      },
      include: {
        lines: {
          orderBy: { updatedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private createPrismaServiceSummary(
    order: Awaited<ReturnType<PrismaRestaurantReadRepository['findActiveOrdersByRestaurantId']>>[number] | null,
    guestCount: number,
  ): ServiceFloorView['servicePoints'][number]['summary'] {
    if (!order) {
      return {
        lineCount: 0,
        guestCount,
        totalCents: 0,
        currency: 'EUR',
        servicePhase: {
          course: 'none',
          status: 'no_order',
        },
      };
    }

    return {
      lineCount: order.lines.length,
      guestCount: order.guestCount,
      totalCents: order.totalCents,
      currency: order.currency,
      servicePhase: deriveServicePhase(
        order.lines.map((line) => ({
          status: line.status as ServiceOrderLineStatus,
          course: this.mapSummaryCourse(line.courseSnapshot),
        })),
      ),
    };
  }

  private mapServiceCourse(course: string): ServicePhaseCourse {
    switch (course) {
      case 'drinks':
        return 'drinks';
      case 'starter':
        return 'starters';
      case 'main':
        return 'mains';
      case 'dessert':
        return 'desserts';
      default:
        return 'none';
    }
  }

  private mapSummaryCourse(course: string): Exclude<ServicePhaseCourse, 'mixed' | 'none'> {
    switch (course) {
      case 'drinks':
        return 'drinks';
      case 'starter':
        return 'starters';
      case 'dessert':
        return 'desserts';
      default:
        return 'mains';
    }
  }

  private mapServiceOrderStatus(status: string): ServiceOrderStatus {
    switch (status) {
      case 'pending_payment':
        return 'payment_pending';
      case 'paid':
        return 'paid';
      default:
        return 'open';
    }
  }

  private mapTableStatus(
    order: Awaited<ReturnType<PrismaRestaurantReadRepository['findActiveOrdersByRestaurantId']>>[number] | null,
  ): ServiceTableStatus {
    if (!order) {
      return 'free';
    }

    if (order.status === 'pending_payment') {
      return 'payment_pending';
    }

    if (order.lines.length > 0 && order.lines.every((line) => line.status === 'served' || line.status === 'cancelled')) {
      return 'served';
    }

    return 'occupied';
  }

  private isPrismaOccupiedStatus(status: ServiceTableStatus): boolean {
    return status !== 'free' && status !== 'reserved';
  }
}
