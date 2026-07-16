import { Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { invalidReservationCreation, invalidReservationState } from '../../../shared/errors/application-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { applyDemoMenuTranslationFallback } from './demo-menu-translation-fallback';
import { asNameI18n } from './name-i18n.mapper';
import type { RestaurantReadRepository } from '../../application/ports/restaurant-read-repository.port';
import type {
  CreateRestaurantReservationInput,
  RestaurantFloors,
  RestaurantMenu,
  RestaurantReservation,
  RestaurantSummary,
} from '../../domain/restaurant-read.models';
import type { RestaurantOrderView } from '../../domain/restaurant-order.models';
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
export class PrismaRestaurantReadRepository implements RestaurantReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listRestaurants(restaurantIds: string[], organizationIds: string[]): Promise<RestaurantSummary[]> {
    if (restaurantIds.length === 0 && organizationIds.length === 0) {
      return [];
    }

    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        OR: [
          ...(restaurantIds.length > 0 ? [{ id: { in: restaurantIds } }] : []),
          ...(organizationIds.length > 0 ? [{ organizationId: { in: organizationIds } }] : []),
        ],
      },
      orderBy: { name: 'asc' },
    });

    return restaurants.map((restaurant) => ({
      id: restaurant.id,
      organizationId: restaurant.organizationId,
      name: restaurant.name,
      displayName: restaurant.displayName,
      timezone: restaurant.timezone,
      currency: restaurant.currency,
      isActive: restaurant.isActive,
    }));
  }

  async findMenuByRestaurantId(restaurantId: string): Promise<RestaurantMenu | null> {
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
                        taxRate: { select: { name: true, ratePercent: true } },
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
                    modifierOptionOverrides: {
                      select: { modifierOptionId: true, priceDeltaCents: true },
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

    const mappedMenu = {
      id: menu.id,
      restaurantId: menu.restaurantId,
      name: menu.name,
      isActive: menu.isActive,
      sections: menu.sections.map((section) => ({
        id: section.id,
        name: section.name,
        nameI18n: asNameI18n(section.nameI18n),
        sortOrder: section.sortOrder,
        isVisible: section.isVisible,
        items: section.items.map((item) => ({
          id: item.id,
          restaurantProductId: item.restaurantProduct.id,
          productId: item.restaurantProduct.product.id,
          name:
            item.displayNameOverride ??
            item.restaurantProduct.displayName ??
            asNameI18n(item.restaurantProduct.product.nameI18n)?.es ??
            item.restaurantProduct.product.name,
          // `nameI18n` viene siempre del Product canonico, nunca de los overrides
          // displayName/displayNameOverride (esos quedan en castellano por ahora,
          // ver Fase 1 del plan multiidioma).
          nameI18n: asNameI18n(item.restaurantProduct.product.nameI18n),
          description:
            item.restaurantProduct.product.description ??
            asNameI18n(item.restaurantProduct.product.descriptionI18n)?.es ??
            undefined,
          // Mismo criterio que `nameI18n`: siempre del Product canonico, nunca de
          // displayDescription/displayDescription override (fuera de alcance por
          // ahora, ver plan multiidioma).
          descriptionI18n: asNameI18n(item.restaurantProduct.product.descriptionI18n),
          imageUrl: item.restaurantProduct.imageUrl,
          productType: item.restaurantProduct.product.productType as 'simple' | 'combo' | 'platter',
          priceCents: item.priceOverrideCents ?? item.restaurantProduct.priceCents,
          currency: item.restaurantProduct.currency,
          isAvailable: item.restaurantProduct.isAvailable && item.isVisible,
          isVisible: item.isVisible,
          productAvailable: item.restaurantProduct.isAvailable,
          defaultCourse: (item.restaurantProduct.product.defaultCourse ?? 'other') as
            | 'drinks'
            | 'starter'
            | 'main'
            | 'dessert'
            | 'other',
          taxRateName: item.restaurantProduct.product.taxRate?.name ?? null,
          taxRatePercent: item.restaurantProduct.product.taxRate
            ? Number(item.restaurantProduct.product.taxRate.ratePercent.toString())
            : null,
          preparationRoute: (item.restaurantProduct.product.defaultPreparationRoute ?? 'direct') as
            | 'direct'
            | 'bar'
            | 'kitchen'
            | 'cold_station'
            | 'dessert_station',
          modifierGroups: item.restaurantProduct.modifierGroups.map(({ modifierGroup }) => ({
            id: modifierGroup.id,
            name: modifierGroup.name,
            nameI18n: asNameI18n(modifierGroup.nameI18n),
            selectionType: (modifierGroup.selectionType === 'single' ? 'single' : 'multiple') as 'single' | 'multiple',
            minSelections: modifierGroup.minSelections,
            maxSelections: modifierGroup.maxSelections,
            isRequired: modifierGroup.isRequired,
            options: modifierGroup.options.map((option) => ({
              id: option.id,
              name: option.name,
              nameI18n: asNameI18n(option.nameI18n),
              priceDeltaCents:
                item.restaurantProduct.modifierOptionOverrides.find((override) => override.modifierOptionId === option.id)?.priceDeltaCents ??
                option.priceDeltaCents,
              isAvailable: option.isAvailable,
            })),
          })),
          comboDefinition: item.restaurantProduct.product.comboDefinition
            ? {
                id: item.restaurantProduct.product.comboDefinition.id,
                slots: item.restaurantProduct.product.comboDefinition.slots.map((slot) => ({
                  id: slot.id,
                  name: slot.name,
                  nameI18n: asNameI18n(slot.nameI18n),
                  minSelections: slot.minSelections,
                  maxSelections: slot.maxSelections,
                  isRequired: slot.isRequired,
                  options: slot.options.map((option) => ({
                    id: option.id,
                    restaurantProductId: option.restaurantProductId,
                    name:
                      option.restaurantProduct.displayName ??
                      asNameI18n(option.restaurantProduct.product.nameI18n)?.es ??
                      option.restaurantProduct.product.name,
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
                nameI18n: asNameI18n(component.nameI18n),
                removable: component.isRemovable,
                replaceable: component.isReplaceable,
                sortOrder: component.sortOrder,
              }))
            : [],
        })),
      })),
    };

    return applyDemoMenuTranslationFallback(mappedMenu);
  }

  async findFloorsByRestaurantId(restaurantId: string): Promise<RestaurantFloors | null> {
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
  }

  async listReservationsByRestaurantId(
    restaurantId: string,
    date?: string,
  ): Promise<RestaurantReservation[] | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });
    if (!restaurant) return null;

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
          include: { table: true },
        },
      },
      orderBy: { reservationAt: 'asc' },
    });

    return reservations.map(mapReservation);
  }

  async findReservationById(restaurantId: string, reservationId: string): Promise<RestaurantReservation | null> {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, restaurantId },
      include: { tables: { include: { table: true } } },
    });
    return reservation ? mapReservation(reservation) : null;
  }

  async findConflictingReservations(restaurantId: string, tableId: string, startTime: Date, endTime: Date): Promise<string[]> {
    const conflicts = await this.prisma.reservationTable.findMany({
      where: {
        tableId,
        reservation: {
          restaurantId,
          status: { notIn: ['cancelled', 'no_show'] },
          reservationAt: { lt: endTime },
          AND: [
            {
              reservationAt: {
                gte: new Date(startTime.getTime() - 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
      },
      include: {
        reservation: { select: { id: true, reservationAt: true, durationMinutes: true } },
      },
    });

    return conflicts
      .filter((c) => {
        const rEnd = new Date(c.reservation.reservationAt.getTime() + c.reservation.durationMinutes * 60 * 1000);
        return c.reservation.reservationAt < endTime && rEnd > startTime;
      })
      .map((c) => c.reservation.id);
  }

  async findTableCapacity(restaurantId: string, tableId: string): Promise<number | null> {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, restaurantId },
      select: { capacity: true },
    });
    return table?.capacity ?? null;
  }

  async createReservation(
    restaurantId: string,
    reservation: CreateRestaurantReservationInput,
  ): Promise<RestaurantReservation | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });
    if (!restaurant) return null;

    const tables = await this.prisma.restaurantTable.findMany({
      where: { restaurantId, id: { in: reservation.tableIds } },
    });

    if (tables.length !== reservation.tableIds.length) {
      throw new ApplicationErrorException(
        invalidReservationCreation({
          reason: 'invalid_table_ids',
          restaurantId,
          tableIds: reservation.tableIds,
        }),
      );
    }

    const created = await this.prisma.reservation.create({
      data: {
        restaurantId,
        customerId: null,
        customerNameSnapshot: reservation.customerNameSnapshot,
        customerPhoneSnapshot: reservation.customerPhoneSnapshot,
        partySize: reservation.partySize,
        reservationAt: new Date(reservation.reservationAt),
        durationMinutes: reservation.durationMinutes,
        status: 'pending',
        notes: reservation.notes,
        depositAmountCents: reservation.depositAmountCents,
        depositPaidAt: reservation.depositPaidAt ? new Date(reservation.depositPaidAt) : null,
        tables: {
          create: reservation.tableIds.map((tableId) => ({ tableId })),
        },
      },
      include: {
        tables: { include: { table: true } },
      },
    });

    return mapReservation(created);
  }

  async updateReservationStatus(
    restaurantId: string,
    reservationId: string,
    status: RestaurantReservation['status'],
  ): Promise<RestaurantReservation | null> {
    const existing = await this.prisma.reservation.findFirst({
      where: { id: reservationId, restaurantId },
      include: { tables: { include: { table: true } } },
    });

    if (!existing) return null;

    if (!canTransitionReservationStatus(existing.status, status)) {
      throw new ApplicationErrorException(
        invalidReservationState({
          restaurantId,
          reservationId,
          from: existing.status,
          to: status,
        }),
      );
    }

    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status },
      include: { tables: { include: { table: true } } },
    });

    return mapReservation(updated);
  }

  async findServiceFloorByRestaurantId(restaurantId: string): Promise<ServiceFloorView | null> {
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
        const summary = this.createServiceSummary(activeOrder, table.capacity);

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
        occupiedCount: servicePoints.filter((sp) => this.isOccupiedStatus(sp.table.status)).length,
        openOrderCount: servicePoints.filter((sp) => activeOrders.some((order) => order.tableId === sp.table.id)).length,
      },
    };
  }

  async findServicePointByRestaurantId(
    restaurantId: string,
    tableId: string,
  ): Promise<ServicePointDetailView | null> {
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
        ...this.createServiceSummary(activeOrder, table.capacity),
        durationMinutes: getServiceDurationMinutes(occupiedAt, serviceStartedAt, new Date()),
      },
    };
  }

  async findServicePointOrderByRestaurantId(
    restaurantId: string,
    tableId: string,
  ): Promise<ServicePointOrderView | null> {
    const floors = await this.findFloorsByRestaurantId(restaurantId);
    if (!floors || !floors.tables.some((candidate) => candidate.id === tableId)) {
      return null;
    }

    const order = await this.prisma.order.findFirst({
      where: { restaurantId, tableId, status: { in: ['open', 'pending_payment'] } },
      include: {
        lines: {
          orderBy: { updatedAt: 'asc' },
          include: {
            modifiers: true,
            comboSlots: true,
          },
        },
      },
    });

    if (!order) {
      return { order: null, lines: [] };
    }

    return {
      order: {
        id: order.id,
        tableId: order.tableId ?? tableId,
        status: this.mapServiceOrderStatus(order.status),
        openedAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        subtotalCents: order.subtotalCents,
        taxCents: order.taxCents,
        totalCents: order.totalCents,
        currency: order.currency,
      },
      lines: order.lines.map((line) => ({
        id: line.id,
        productName: line.productNameSnapshot,
        productType: line.productTypeSnapshot as 'simple' | 'combo' | 'platter',
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        subtotalCents: line.subtotalCents,
        taxRateName: line.taxRateNameSnapshot,
        taxRatePercent: line.taxRatePercentSnapshot ? Number(line.taxRatePercentSnapshot.toString()) : null,
        taxCents: line.taxCents,
        status: line.status as ServiceOrderLineStatus,
        course: this.mapServiceCourse(line.courseSnapshot),
        preparationRoute: line.preparationRouteSnapshot as ServicePointOrderView['lines'][number]['preparationRoute'],
        kitchenNote: line.kitchenNote,
        updatedAt: line.updatedAt.toISOString(),
        modifiers: line.modifiers.map((m) => ({
          groupName: m.groupNameSnapshot,
          optionName: m.optionNameSnapshot,
          priceDeltaCents: m.priceDeltaCents,
          quantity: m.quantity,
        })),
        comboSlots: line.comboSlots.map((s) => ({
          slotName: s.slotNameSnapshot,
          selectedProductName: s.selectedProductNameSnapshot,
          supplementPriceCents: s.supplementPriceCents,
          quantity: s.quantity,
        })),
      })),
    };
  }

  async occupyServicePoint(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null> {
    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async sendServicePointOrderToKitchen(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null> {
    const order = await this.prisma.order.findFirst({
      where: { restaurantId, tableId, status: { in: ['open', 'pending_payment'] } },
    });

    if (order) {
      await this.prisma.orderLine.updateMany({
        where: { orderId: order.id, status: 'pending' },
        data: { status: 'preparing' },
      });
    }

    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async markServicePointOrderServed(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null> {
    const order = await this.prisma.order.findFirst({
      where: { restaurantId, tableId, status: { in: ['open', 'pending_payment'] } },
    });

    if (order) {
      await this.prisma.orderLine.updateMany({
        where: { orderId: order.id, status: { notIn: ['cancelled'] } },
        data: { status: 'served' },
      });
    }

    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async chargeServicePoint(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null> {
    const order = await this.prisma.order.findFirst({
      where: { restaurantId, tableId, status: 'open' },
    });

    if (order) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'pending_payment' },
      });
    }

    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async setServicePointStatus(
    restaurantId: string,
    tableId: string,
    _status: ServiceTableStatus,
  ): Promise<ServicePointDetailView | null> {
    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async reorderFloorElements(
    restaurantId: string,
    floorId: string,
    elements: Array<{ id: string; x: number; y: number; width: number; height: number; sortOrder: number }>,
  ): Promise<RestaurantFloors | null> {
    const floor = await this.prisma.restaurantFloor.findFirst({
      where: { id: floorId, restaurantId },
    });
    if (!floor) return null;

    await Promise.all(
      elements.map((element) =>
        this.prisma.floorElement.update({
          where: { id: element.id },
          data: { x: element.x, y: element.y, width: element.width, height: element.height, sortOrder: element.sortOrder },
        }),
      ),
    );

    return this.findFloorsByRestaurantId(restaurantId);
  }

  async updateFloor(
    restaurantId: string,
    floorId: string,
    floor: { name: string; rows: number; columns: number },
  ): Promise<RestaurantFloors | null> {
    const existing = await this.prisma.restaurantFloor.findFirst({
      where: { id: floorId, restaurantId },
    });
    if (!existing) return null;

    await this.prisma.restaurantFloor.update({
      where: { id: floorId },
      data: { name: floor.name, rows: floor.rows, columns: floor.columns },
    });

    return this.findFloorsByRestaurantId(restaurantId);
  }

  async updateFloorElement(
    restaurantId: string,
    floorId: string,
    elementId: string,
    element: {
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      shape: 'round' | 'square' | 'rectangle' | 'long' | null;
      capacity: number | null;
    },
  ): Promise<RestaurantFloors | null> {
    const existing = await this.prisma.floorElement.findFirst({
      where: { id: elementId, floorId, floor: { restaurantId } },
    });
    if (!existing) return null;

    await this.prisma.floorElement.update({
      where: { id: elementId },
      data: {
        label: element.label,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        shape: element.shape,
      },
    });

    if (existing.tableId && element.capacity !== null) {
      await this.prisma.restaurantTable.update({
        where: { id: existing.tableId },
        data: { name: element.label, capacity: element.capacity },
      });
    }

    return this.findFloorsByRestaurantId(restaurantId);
  }

  async createFloorElement(
    restaurantId: string,
    floorId: string,
    element: {
      type: 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      tableId: string | null;
      shape: 'round' | 'square' | 'rectangle' | 'long' | null;
      sortOrder: number;
    },
  ): Promise<RestaurantFloors | null> {
    const floor = await this.prisma.restaurantFloor.findFirst({
      where: { id: floorId, restaurantId },
    });
    if (!floor) return null;

    let tableId = element.tableId;

    if ((element.type === 'table' || element.type === 'stool') && !tableId) {
      const maxTable = await this.prisma.restaurantTable.findFirst({
        where: { restaurantId },
        orderBy: { tableNumber: 'desc' },
        select: { tableNumber: true },
      });

      const nextTableNumber = (maxTable?.tableNumber ?? 0) + 1;
      const newTable = await this.prisma.restaurantTable.create({
        data: {
          restaurantId,
          tableNumber: nextTableNumber,
          name: element.label,
          capacity: element.type === 'stool' ? 1 : 4,
          isActive: true,
        },
      });
      tableId = newTable.id;
    }

    await this.prisma.floorElement.create({
      data: {
        floorId,
        type: element.type,
        label: element.label,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        tableId,
        shape: element.shape,
        sortOrder: element.sortOrder,
      },
    });

    return this.findFloorsByRestaurantId(restaurantId);
  }

  async updateServiceOrderLineStatus(
    _restaurantId: string,
    _orderId: string,
    _lineId: string,
    _status: 'sent_to_kitchen' | 'preparing' | 'ready' | 'served',
  ): Promise<RestaurantOrderView | null> {
    // Orders are persisted via PrismaRestaurantOrderRepository. Use cases that
    // update line status will find the order through that repo first and call
    // orders.updateLineStatus() instead of this method. If this path is reached,
    // the order does not exist in Prisma → return null so the use case can error.
    return null;
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

  private createServiceSummary(
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

    if (order.lines.some((line) => line.status === 'preparing' || line.status === 'ready')) {
      return 'waiting_kitchen';
    }

    return 'occupied';
  }

  private isOccupiedStatus(status: ServiceTableStatus): boolean {
    return status !== 'free' && status !== 'reserved';
  }
}

function mapReservation(
  reservation: {
    id: string;
    customerId: string | null;
    customerNameSnapshot: string;
    customerPhoneSnapshot: string | null;
    partySize: number;
    reservationAt: Date;
    durationMinutes: number;
    status: string;
    notes: string | null;
    tables: Array<{ tableId: string; table: { id: string; tableNumber: number; name: string | null } }>;
    depositAmountCents: number;
    depositPaidAt: Date | null;
  },
): RestaurantReservation {
  return {
    id: reservation.id,
    customerId: reservation.customerId,
    customerNameSnapshot: reservation.customerNameSnapshot,
    customerPhoneSnapshot: reservation.customerPhoneSnapshot,
    partySize: reservation.partySize,
    reservationAt: reservation.reservationAt.toISOString(),
    durationMinutes: reservation.durationMinutes,
    status: reservation.status as RestaurantReservation['status'],
    notes: reservation.notes,
    tableIds: reservation.tables.map(({ tableId }) => tableId),
    tables: reservation.tables.map(({ table }) => ({
      id: table.id,
      tableNumber: table.tableNumber,
      name: table.name ?? '',
    })),
    depositAmountCents: reservation.depositAmountCents,
    depositPaidAt: reservation.depositPaidAt ? reservation.depositPaidAt.toISOString() : null,
  };
}

function canTransitionReservationStatus(
  currentStatus: string,
  nextStatus: string,
): boolean {
  if (currentStatus === nextStatus) return true;
  if (currentStatus === 'pending') return nextStatus === 'confirmed' || nextStatus === 'cancelled';
  if (currentStatus === 'confirmed') return nextStatus === 'seated' || nextStatus === 'no_show' || nextStatus === 'cancelled';
  return false;
}
