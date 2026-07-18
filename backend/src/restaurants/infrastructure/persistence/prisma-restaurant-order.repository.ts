import { Injectable } from '@nestjs/common';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { calculateOrderTotals, calculatePaymentSummary, includedTaxCents } from '../../domain/order-pricing';
import type {
  AddOrderLineCommand,
  CancelOrderLineCommand,
  DeleteOrderLineCommand,
  KitchenOrderLineStatus,
  OpenRestaurantOrderCommand,
  OrderLineStatus,
  OrderStatus,
  PaymentMethod,
  RegisterOrderPaymentCommand,
  RestaurantOrderComboSlotView,
  RestaurantOrderLineView,
  RestaurantOrderModifierView,
  RestaurantOrderPaymentView,
  RestaurantOrderPlatterComponentView,
  RestaurantOrderView,
  UpdateOrderLineCommand,
  UpdateOrderLineStatusCommand,
} from '../../domain/restaurant-order.models';
import type { RestaurantOrderRepository } from '../../application/ports/restaurant-order-repository.port';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type RawPayment = {
  id: string;
  method: string;
  amountCents: number;
  status: string;
  paidAt: Date | null;
};

type RawModifier = {
  groupNameSnapshot: string;
  optionNameSnapshot: string;
  priceDeltaCents: number;
  quantity: number;
};

type RawComboSlot = {
  slotNameSnapshot: string;
  selectedProductNameSnapshot: string;
  supplementPriceCents: number;
  quantity: number;
};

type RawPlatterComponent = {
  componentNameSnapshot: string;
  removed: boolean;
  replacementNameSnapshot: string | null;
  priceDeltaCents: number;
};

type RawOrderLine = {
  id: string;
  restaurantProductId: string | null;
  productId: string | null;
  restaurantProduct: { imageUrl: string | null } | null;
  productNameSnapshot: string;
  productTypeSnapshot: string;
  courseSnapshot: string;
  preparationRouteSnapshot: string;
  basePriceCentsSnapshot: number;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  taxRateNameSnapshot: string | null;
  taxRatePercentSnapshot: { toString(): string } | null;
  taxCents: number;
  status: string;
  sentToKitchenAt?: Date | null;
  kitchenNote: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  configurationSignature: string;
  modifiers: RawModifier[];
  comboSlots: RawComboSlot[];
  platterComponents: RawPlatterComponent[];
};

type RawOrder = {
  id: string;
  dailyNumber: number;
  restaurantId: string;
  tableId: string | null;
  status: string;
  currency: string;
  guestCount: number;
  subtotalCents: number;
  taxCents: number;
  discountTotalCents: number;
  totalCents: number;
  closedAt: Date | null;
  clientOrigin: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: RawOrderLine[];
  payments: RawPayment[];
};

// ── Catalog types for addLine validation ──────────────────────────────────────

type RawCatalogModifierOption = { id: string; name: string; priceDeltaCents: number };
type RawCatalogModifierGroup = { id: string; name: string; options: RawCatalogModifierOption[] };
type RawCatalogRpModifierGroup = { modifierGroupId: string; modifierGroup: RawCatalogModifierGroup };
type RawCatalogModifierOptionOverride = { modifierOptionId: string; priceDeltaCents: number };

type RawCatalogComboSlotOption = {
  id: string;
  restaurantProductId: string;
  supplementPriceCents: number;
  restaurantProduct: { product: { name: string } };
};
type RawCatalogComboSlot = { id: string; name: string; options: RawCatalogComboSlotOption[] };
type RawCatalogComboDefinition = { slots: RawCatalogComboSlot[] };

type RawCatalogPlatterComponent = { id: string; name: string; isRemovable: boolean };
type RawCatalogPlatterDefinition = { components: RawCatalogPlatterComponent[] };

type RawCatalogTaxRate = { name: string; ratePercent: { toString(): string } };

type RawCatalogProduct = {
  name: string;
  productType: string;
  defaultCourse: string;
  defaultPreparationRoute: string;
  taxRate: RawCatalogTaxRate | null;
  comboDefinition: RawCatalogComboDefinition | null;
  platterDefinition: RawCatalogPlatterDefinition | null;
};

type RawCatalogRestaurantProduct = {
  id: string;
  restaurantId: string;
  productId: string;
  priceCents: number;
  displayName: string | null;
  preparationRouteOverride: string | null;
  product: RawCatalogProduct;
  modifierGroups: RawCatalogRpModifierGroup[];
  modifierOptionOverrides: RawCatalogModifierOptionOverride[];
};

const ORDER_INCLUDE = {
  lines: {
    orderBy: [
      { createdAt: 'asc' as const },
      { id: 'asc' as const },
    ],
    include: {
      modifiers: true,
      comboSlots: true,
      platterComponents: true,
      restaurantProduct: {
        select: { imageUrl: true },
      },
    },
  },
  payments: {
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class PrismaRestaurantOrderRepository implements RestaurantOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async tableExists(restaurantId: string, tableId: string): Promise<boolean> {
    const count = await this.prisma.restaurantTable.count({
      where: { id: tableId, restaurantId },
    });
    return count > 0;
  }

  async findActiveByTable(restaurantId: string, tableId: string): Promise<RestaurantOrderView | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        restaurantId,
        tableId,
        status: { in: ['open', 'pending_payment'] },
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return order ? this.mapOrder(order as unknown as RawOrder) : null;
  }

  async findById(restaurantId: string, orderId: string): Promise<RestaurantOrderView | null> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: ORDER_INCLUDE,
    });
    return order ? this.mapOrder(order as unknown as RawOrder) : null;
  }

  async clearActiveByTable(restaurantId: string, tableId: string): Promise<void> {
    await this.prisma.order.deleteMany({
      where: {
        restaurantId,
        tableId,
        status: { in: ['open', 'pending_payment'] },
      },
    });
  }

  async open(command: OpenRestaurantOrderCommand): Promise<RestaurantOrderView> {
    const orderId = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUniqueOrThrow({ where: { id: command.restaurantId } });

      // Numero de ticket visible al cliente: contador diario por restaurante, calculado
      // dentro de la misma transaccion en la que se crea el pedido. No es una clave de
      // negocio (no hay restriccion de unicidad) ni requiere aislamiento serializable: es
      // solo cosmetico para el ticket, asi que una colision entre dos aperturas
      // exactamente simultaneas en el mismo restaurante es un riesgo aceptado.
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const ordersToday = await tx.order.count({
        where: { restaurantId: command.restaurantId, createdAt: { gte: dayStart } },
      });

      const created = await tx.order.create({
        data: {
          restaurantId: command.restaurantId,
          tableId: command.tableId,
          openedByUserId: command.openedByUserId,
          status: 'open',
          currency: restaurant.currency,
          guestCount: command.guestCount,
          dailyNumber: ordersToday + 1,
          clientOrigin: command.clientOrigin ?? null,
          subtotalCents: 0,
          taxCents: 0,
          discountTotalCents: 0,
          totalCents: 0,
        },
      });
      return created.id;
    });

    return this.getOrderOrThrow(command.restaurantId, orderId);
  }

  async addLine(command: AddOrderLineCommand): Promise<RestaurantOrderView> {
    const orderId = await this.prisma.$transaction(async (tx) => {
      // 1. Load and validate order
      const order = await tx.order.findFirst({
        where: { id: command.orderId, restaurantId: command.restaurantId },
        include: { payments: { where: { status: 'completed' } } },
      });
      if (!order) {
        throw new ApplicationErrorException(
          applicationError('order_not_found', `Order "${command.orderId}" not found.`, { orderId: command.orderId }),
        );
      }
      if (order.payments.length > 0) {
        throw new ApplicationErrorException(
          applicationError('invalid_order_state', 'Order cannot be modified after a completed payment.'),
        );
      }

      // 2. Load restaurant product with full catalog graph
      const rp = await tx.restaurantProduct.findFirst({
        where: { id: command.restaurantProductId, restaurantId: command.restaurantId },
        include: {
          product: {
            include: {
              taxRate: true,
              comboDefinition: {
                include: {
                  slots: {
                    include: {
                      options: { include: { restaurantProduct: { include: { product: true } } } },
                    },
                  },
                },
              },
              platterDefinition: { include: { components: true } },
            },
          },
          modifierGroups: {
            include: { modifierGroup: { include: { options: true } } },
          },
          modifierOptionOverrides: {
            select: { modifierOptionId: true, priceDeltaCents: true },
          },
        },
      }) as unknown as RawCatalogRestaurantProduct | null;

      if (!rp) {
        throw new ApplicationErrorException(
          applicationError(
            'restaurant_product_not_found',
            `Restaurant product "${command.restaurantProductId}" not found.`,
            { restaurantProductId: command.restaurantProductId },
          ),
        );
      }

      // 3. Validate modifier selections
      // El precio del modificador puede sobrescribirse por producto (Fase 2: overrides de precio
      // de modificador). Si existe override para este restaurantProduct, prevalece sobre el
      // priceDeltaCents por defecto del ModifierOption.
      const overrideByOptionId = new Map((rp.modifierOptionOverrides ?? []).map((o) => [o.modifierOptionId, o.priceDeltaCents]));
      const modifierSnapshots: Array<{ groupNameSnapshot: string; optionNameSnapshot: string; priceDeltaCents: number; quantity: number }> = [];
      for (const mod of command.modifiers) {
        const rpModGroup = rp.modifierGroups.find((g) => g.modifierGroupId === mod.modifierGroupId);
        if (!rpModGroup) {
          throw new ApplicationErrorException(
            applicationError('invalid_order_configuration', `Modifier group "${mod.modifierGroupId}" is not available for this product.`),
          );
        }
        const option = rpModGroup.modifierGroup.options.find((o) => o.id === mod.modifierOptionId);
        if (!option) {
          throw new ApplicationErrorException(
            applicationError('invalid_order_configuration', `Modifier option "${mod.modifierOptionId}" not found in group "${mod.modifierGroupId}".`),
          );
        }
        modifierSnapshots.push({
          groupNameSnapshot: rpModGroup.modifierGroup.name,
          optionNameSnapshot: option.name,
          priceDeltaCents: overrideByOptionId.get(option.id) ?? option.priceDeltaCents,
          quantity: mod.quantity,
        });
      }

      // 4. Validate combo slot selections
      const comboSlotSnapshots: Array<{ slotNameSnapshot: string; selectedProductNameSnapshot: string; supplementPriceCents: number; quantity: number }> = [];
      for (const slot of command.comboSlots) {
        const comboSlot = rp.product.comboDefinition?.slots.find((s) => s.id === slot.comboSlotId);
        if (!comboSlot) {
          throw new ApplicationErrorException(
            applicationError('invalid_order_configuration', `Combo slot "${slot.comboSlotId}" not found for this product.`),
          );
        }
        const option = comboSlot.options.find((o) => o.restaurantProductId === slot.restaurantProductId);
        if (!option) {
          throw new ApplicationErrorException(
            applicationError('invalid_order_configuration', `Combo slot option for product "${slot.restaurantProductId}" not found in slot "${slot.comboSlotId}".`),
          );
        }
        comboSlotSnapshots.push({
          slotNameSnapshot: comboSlot.name,
          selectedProductNameSnapshot: option.restaurantProduct.product.name,
          supplementPriceCents: option.supplementPriceCents,
          quantity: slot.quantity,
        });
      }

      // 5. Validate platter component removals
      const platterComponentSnapshots: Array<{ componentNameSnapshot: string; removed: boolean; replacementNameSnapshot: string | null; priceDeltaCents: number }> = [];
      for (const comp of command.platterComponents) {
        const component = rp.product.platterDefinition?.components.find((c) => c.id === comp.platterComponentId);
        if (!component) {
          throw new ApplicationErrorException(
            applicationError('invalid_order_configuration', `Platter component "${comp.platterComponentId}" not found for this product.`),
          );
        }
        if (!comp.included && !component.isRemovable) {
          throw new ApplicationErrorException(
            applicationError('invalid_order_configuration', `Platter component "${comp.platterComponentId}" is not removable.`),
          );
        }
        platterComponentSnapshots.push({
          componentNameSnapshot: component.name,
          removed: !comp.included,
          replacementNameSnapshot: null,
          priceDeltaCents: 0,
        });
      }

      // 6. Calculate pricing
      const basePriceCents = rp.priceCents;
      const modifierSupplement = modifierSnapshots.reduce((sum, m) => sum + m.priceDeltaCents * m.quantity, 0);
      const comboSupplement = comboSlotSnapshots.reduce((sum, s) => sum + s.supplementPriceCents * s.quantity, 0);
      const unitPriceCents = basePriceCents + modifierSupplement + comboSupplement;
      const subtotalCents = unitPriceCents * command.quantity;
      const taxRatePercent = rp.product.taxRate ? Number(rp.product.taxRate.ratePercent.toString()) : 0;
      const lineTaxCents = includedTaxCents(subtotalCents, taxRatePercent);

      const configurationSignature = this.buildSignature(command);
      const productName = rp.displayName ?? rp.product.name;
      const preparationRoute = rp.preparationRouteOverride ?? rp.product.defaultPreparationRoute;

      // 7. Create order line with children atomically
      await tx.orderLine.create({
        data: {
          orderId: command.orderId,
          restaurantProductId: command.restaurantProductId,
          productId: rp.productId,
          productNameSnapshot: productName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          productTypeSnapshot: rp.product.productType as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          courseSnapshot: rp.product.defaultCourse as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          preparationRouteSnapshot: preparationRoute as any,
          basePriceCentsSnapshot: basePriceCents,
          unitPriceCents,
          quantity: command.quantity,
          subtotalCents,
          taxRateNameSnapshot: rp.product.taxRate?.name ?? null,
          taxRatePercentSnapshot: rp.product.taxRate?.ratePercent.toString() ?? null,
          taxCents: lineTaxCents,
          status: 'pending',
          kitchenNote: command.kitchenNote,
          configurationSignature,
          modifiers: { create: modifierSnapshots },
          comboSlots: { create: comboSlotSnapshots },
          platterComponents: { create: platterComponentSnapshots },
        },
      });

      // 8. Recalculate order totals
      const allLines = await tx.orderLine.findMany({
        where: { orderId: command.orderId },
        select: { subtotalCents: true, taxCents: true, status: true },
      });
      const { subtotalCents: newSubtotal, taxCents: newTax, totalCents: newTotal } = calculateOrderTotals(
        allLines.map((l) => ({ subtotalCents: l.subtotalCents, taxCents: l.taxCents, status: l.status as import('../../domain/restaurant-order.models').OrderLineStatus })),
        order.discountTotalCents,
      );
      await tx.order.update({
        where: { id: command.orderId },
        data: { subtotalCents: newSubtotal, taxCents: newTax, totalCents: newTotal },
      });

      // 9. Return final order state
      return command.orderId;
    });

    return this.getOrderOrThrow(command.restaurantId, orderId);
  }

  async updatePendingLine(command: UpdateOrderLineCommand): Promise<RestaurantOrderView> {
    const orderId = await this.prisma.$transaction(async (tx) => {
      // Load line to verify it exists and check its status
      const line = await tx.orderLine.findFirst({
        where: { id: command.lineId, orderId: command.orderId, order: { restaurantId: command.restaurantId } },
        select: { id: true, status: true, unitPriceCents: true, taxRatePercentSnapshot: true, order: { select: { discountTotalCents: true } } },
      });

      if (!line) {
        throw new ApplicationErrorException(
          applicationError('order_line_not_found', `Order line "${command.lineId}" not found.`, { lineId: command.lineId }),
        );
      }
      if (line.status !== 'pending') {
        throw new ApplicationErrorException(
          applicationError('invalid_order_state', 'Only pending lines can be edited.', { status: line.status }),
        );
      }

      // Check no completed payments exist
      const completedPayment = await tx.payment.findFirst({
        where: { orderId: command.orderId, status: 'completed' },
        select: { id: true },
      });
      if (completedPayment) {
        throw new ApplicationErrorException(
          applicationError('invalid_order_state', 'Order cannot be modified after a completed payment.'),
        );
      }

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (command.kitchenNote !== undefined) updateData['kitchenNote'] = command.kitchenNote;
      if (command.quantity !== undefined) {
        const newSubtotal = line.unitPriceCents * command.quantity;
        const taxRatePercent = line.taxRatePercentSnapshot
          ? Number((line.taxRatePercentSnapshot as { toString(): string }).toString())
          : 0;
        updateData['quantity'] = command.quantity;
        updateData['subtotalCents'] = newSubtotal;
        updateData['taxCents'] = includedTaxCents(newSubtotal, taxRatePercent);
      }

      await tx.orderLine.update({ where: { id: command.lineId }, data: updateData });

      // Recalculate order totals
      const allLines = await tx.orderLine.findMany({
        where: { orderId: command.orderId },
        select: { subtotalCents: true, taxCents: true, status: true },
      });
      const { subtotalCents, taxCents, totalCents } = calculateOrderTotals(
        allLines.map((l) => ({ subtotalCents: l.subtotalCents, taxCents: l.taxCents, status: l.status as OrderLineStatus })),
        line.order.discountTotalCents,
      );
      await tx.order.update({ where: { id: command.orderId }, data: { subtotalCents, taxCents, totalCents } });

      return command.orderId;
    });

    return this.getOrderOrThrow(command.restaurantId, orderId);
  }

  async deletePendingLine(command: DeleteOrderLineCommand): Promise<RestaurantOrderView> {
    const orderId = await this.prisma.$transaction(async (tx) => {
      const line = await tx.orderLine.findFirst({
        where: { id: command.lineId, orderId: command.orderId, order: { restaurantId: command.restaurantId } },
        select: { id: true, status: true, order: { select: { discountTotalCents: true } } },
      });

      if (!line) {
        throw new ApplicationErrorException(
          applicationError('order_line_not_found', `Order line "${command.lineId}" not found.`, { lineId: command.lineId }),
        );
      }
      if (line.status !== 'pending') {
        throw new ApplicationErrorException(
          applicationError('invalid_order_state', 'Only pending lines can be deleted.', { status: line.status }),
        );
      }

      const completedPayment = await tx.payment.findFirst({
        where: { orderId: command.orderId, status: 'completed' },
        select: { id: true },
      });
      if (completedPayment) {
        throw new ApplicationErrorException(
          applicationError('invalid_order_state', 'Order cannot be modified after a completed payment.'),
        );
      }

      await tx.orderLine.delete({ where: { id: command.lineId } });

      const remainingLines = await tx.orderLine.findMany({
        where: { orderId: command.orderId },
        select: { subtotalCents: true, taxCents: true, status: true },
      });
      const { subtotalCents, taxCents, totalCents } = calculateOrderTotals(
        remainingLines.map((l) => ({ subtotalCents: l.subtotalCents, taxCents: l.taxCents, status: l.status as OrderLineStatus })),
        line.order.discountTotalCents,
      );
      await tx.order.update({ where: { id: command.orderId }, data: { subtotalCents, taxCents, totalCents } });

      return command.orderId;
    });

    return this.getOrderOrThrow(command.restaurantId, orderId);
  }

  async cancelLine(command: CancelOrderLineCommand): Promise<RestaurantOrderView> {
    const orderId = await this.prisma.$transaction(async (tx) => {
      const line = await tx.orderLine.findFirst({
        where: { id: command.lineId, orderId: command.orderId, order: { restaurantId: command.restaurantId } },
        select: { id: true, status: true, order: { select: { discountTotalCents: true } } },
      });

      if (!line) {
        throw new ApplicationErrorException(
          applicationError('order_line_not_found', `Order line "${command.lineId}" not found.`, { lineId: command.lineId }),
        );
      }
      if (line.status !== 'preparing' && line.status !== 'ready') {
        throw new ApplicationErrorException(
          applicationError('invalid_order_state', 'Only preparing or ready lines can be cancelled.', { status: line.status }),
        );
      }

      const completedPayment = await tx.payment.findFirst({
        where: { orderId: command.orderId, status: 'completed' },
        select: { id: true },
      });
      if (completedPayment) {
        throw new ApplicationErrorException(
          applicationError('invalid_order_state', 'Order cannot be modified after a completed payment.'),
        );
      }

      await tx.orderLine.update({
        where: { id: command.lineId },
        data: { status: 'cancelled', cancellationReason: command.reason, cancelledAt: new Date() },
      });

      const allLines = await tx.orderLine.findMany({
        where: { orderId: command.orderId },
        select: { subtotalCents: true, taxCents: true, status: true },
      });
      const { subtotalCents, taxCents, totalCents } = calculateOrderTotals(
        allLines.map((l) => ({ subtotalCents: l.subtotalCents, taxCents: l.taxCents, status: l.status as OrderLineStatus })),
        line.order.discountTotalCents,
      );
      await tx.order.update({ where: { id: command.orderId }, data: { subtotalCents, taxCents, totalCents } });

      return command.orderId;
    });

    return this.getOrderOrThrow(command.restaurantId, orderId);
  }

  async updateLineStatus(command: UpdateOrderLineStatusCommand): Promise<RestaurantOrderView> {
    const ALLOWED_TRANSITIONS: Record<KitchenOrderLineStatus, OrderLineStatus[]> = {
      sent_to_kitchen: ['preparing'],
      preparing: ['pending'],
      ready: ['preparing'],
      served: ['ready'],
    };
    // sent_to_kitchen is a service-layer concept; in the DB it maps back to pending
    const DB_STATUS_MAP: Partial<Record<KitchenOrderLineStatus, OrderLineStatus>> = {
      sent_to_kitchen: 'pending',
    };

    const orderId = await this.prisma.$transaction(async (tx) => {
      const line = await tx.orderLine.findFirst({
        where: { id: command.lineId, orderId: command.orderId, order: { restaurantId: command.restaurantId } },
        select: { id: true, status: true },
      });

      if (!line) {
        throw new ApplicationErrorException(
          applicationError('order_line_not_found', `Order line "${command.lineId}" not found.`, { lineId: command.lineId }),
        );
      }

      const allowedFrom = ALLOWED_TRANSITIONS[command.status];
      if (!allowedFrom.includes(line.status as OrderLineStatus)) {
        throw new ApplicationErrorException(
          applicationError('invalid_order_state', `Cannot transition line from "${line.status}" to "${command.status}".`, {
            currentStatus: line.status,
            targetStatus: command.status,
          }),
        );
      }

      const dbStatus = DB_STATUS_MAP[command.status] ?? (command.status as OrderLineStatus);
      await tx.orderLine.update({ where: { id: command.lineId }, data: { status: dbStatus } });

      return command.orderId;
    });

    return this.getOrderOrThrow(command.restaurantId, orderId);
  }

  async sendPendingLinesToKitchen(restaurantId: string, tableId: string): Promise<RestaurantOrderView | null> {
    const order = await this.prisma.order.findFirst({
      where: { restaurantId, tableId, status: { in: ['open', 'pending_payment'] } },
      select: { id: true },
    });
    if (!order) return null;

    // Enviar a cocina NO empieza la preparacion: la linea queda en la columna
    // "Pendiente" del tablero de cocina (status pending + sentToKitchenAt) y
    // es cocina quien la mueve a 'preparing' cuando se pone con ella.
    await this.prisma.orderLine.updateMany({
      where: { orderId: order.id, status: 'pending', sentToKitchenAt: null },
      data: { sentToKitchenAt: new Date() },
    });

    return this.findById(restaurantId, order.id);
  }

  async markActiveLinesServed(restaurantId: string, tableId: string, lineIds?: string[]): Promise<RestaurantOrderView | null> {
    const order = await this.prisma.order.findFirst({
      where: { restaurantId, tableId, status: { in: ['open', 'pending_payment'] } },
      select: { id: true },
    });
    if (!order) return null;

    await this.prisma.orderLine.updateMany({
      where: {
        orderId: order.id,
        ...(lineIds?.length
          ? { id: { in: lineIds }, status: { in: ['pending', 'preparing', 'ready'] } }
          : {
            // Sin lineIds ("Marcar servido" de la mesa entera) se sirven las
            // lineas en curso Y las ya enviadas a cocina (pending +
            // sentToKitchenAt), pero NO las anadidas sin enviar todavia.
            OR: [
              { status: { in: ['preparing', 'ready'] } },
              { status: 'pending', sentToKitchenAt: { not: null } },
            ],
          }),
      },
      data: { status: 'served' },
    });

    return this.findById(restaurantId, order.id);
  }

  async registerPayment(command: RegisterOrderPaymentCommand): Promise<RestaurantOrderView> {
    const orderId = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: command.orderId, restaurantId: command.restaurantId },
        include: { payments: { where: { status: 'completed' } } },
      });

      if (!order) {
        throw new ApplicationErrorException(
          applicationError('order_not_found', `Order "${command.orderId}" not found.`, { orderId: command.orderId }),
        );
      }
      if (order.status === 'paid' || order.status === 'cancelled') {
        throw new ApplicationErrorException(
          applicationError('invalid_order_state', `Cannot register a payment on a ${order.status} order.`, { status: order.status }),
        );
      }

      const paidCents = order.payments.reduce((sum: number, p: { amountCents: number }) => sum + p.amountCents, 0);
      const balanceCents = Math.max(0, order.totalCents - paidCents);

      if (command.amountCents > balanceCents) {
        throw new ApplicationErrorException(
          applicationError('payment_exceeds_balance', 'Payment amount exceeds the remaining balance.', {
            amountCents: command.amountCents,
            balanceCents,
          }),
        );
      }

      const now = new Date();
      await tx.payment.create({
        data: {
          orderId: command.orderId,
          method: command.method,
          amountCents: command.amountCents,
          status: 'completed',
          paidAt: now,
        },
      });

      const newBalance = balanceCents - command.amountCents;
      const newStatus: OrderStatus = newBalance === 0 ? 'paid' : 'pending_payment';
      if (newBalance === 0) {
        await tx.orderLine.updateMany({
          where: { orderId: command.orderId, status: 'pending' },
          data: { status: 'preparing' },
        });
      }
      await tx.order.update({
        where: { id: command.orderId },
        data: { status: newStatus, closedAt: newBalance === 0 ? now : null },
      });

      return command.orderId;
    });

    return this.getOrderOrThrow(command.restaurantId, orderId);
  }

  private async getOrderOrThrow(restaurantId: string, orderId: string): Promise<RestaurantOrderView> {
    const order = await this.prisma.order.findFirstOrThrow({
      where: { id: orderId, restaurantId },
      include: ORDER_INCLUDE,
    });
    return this.mapOrder(order as unknown as RawOrder);
  }

  private mapOrder(raw: RawOrder): RestaurantOrderView {
    const { paidCents, balanceCents } = calculatePaymentSummary(
      raw.totalCents,
      raw.payments.map((p) => ({ amountCents: p.amountCents, status: p.status })),
    );

    return {
      order: {
        id: raw.id,
        dailyNumber: raw.dailyNumber,
        restaurantId: raw.restaurantId,
        tableId: raw.tableId,
        status: raw.status as OrderStatus,
        currency: raw.currency,
        guestCount: raw.guestCount,
        subtotalCents: raw.subtotalCents,
        taxCents: raw.taxCents,
        discountTotalCents: raw.discountTotalCents,
        totalCents: raw.totalCents,
        paidCents,
        balanceCents,
        openedAt: raw.createdAt.toISOString(),
        updatedAt: raw.updatedAt.toISOString(),
        closedAt: raw.closedAt?.toISOString() ?? null,
        clientOrigin: raw.clientOrigin ?? null,
      },
      lines: raw.lines.map((line) => this.mapLine(line)),
      payments: raw.payments.map((p) => this.mapPayment(p)),
    };
  }

  private mapLine(line: RawOrderLine): RestaurantOrderLineView {
    return {
      id: line.id,
      restaurantProductId: line.restaurantProductId,
      productId: line.productId,
      imageUrl: line.restaurantProduct?.imageUrl ?? null,
      productName: line.productNameSnapshot,
      productType: line.productTypeSnapshot as RestaurantOrderLineView['productType'],
      course: line.courseSnapshot as RestaurantOrderLineView['course'],
      preparationRoute: line.preparationRouteSnapshot as RestaurantOrderLineView['preparationRoute'],
      basePriceCents: line.basePriceCentsSnapshot,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      subtotalCents: line.subtotalCents,
      taxRateName: line.taxRateNameSnapshot,
      taxRatePercent: line.taxRatePercentSnapshot ? Number(line.taxRatePercentSnapshot.toString()) : null,
      taxCents: line.taxCents,
      // En BD la linea enviada a cocina sigue en 'pending' (cocina aun no ha
      // empezado); la marca sentToKitchenAt es lo que la distingue de una
      // linea recien anadida. Hacia fuera se expone como 'sent_to_kitchen',
      // el mismo estado que ya usan el repo demo y el tablero de cocina.
      status:
        line.status === 'pending' && line.sentToKitchenAt
          ? 'sent_to_kitchen'
          : (line.status as OrderLineStatus),
      kitchenNote: line.kitchenNote,
      cancellationReason: line.cancellationReason,
      cancelledAt: line.cancelledAt?.toISOString() ?? null,
      configurationSignature: line.configurationSignature,
      modifiers: line.modifiers.map((m): RestaurantOrderModifierView => ({
        groupName: m.groupNameSnapshot,
        optionName: m.optionNameSnapshot,
        priceDeltaCents: m.priceDeltaCents,
        quantity: m.quantity,
      })),
      comboSlots: line.comboSlots.map((s): RestaurantOrderComboSlotView => ({
        slotName: s.slotNameSnapshot,
        selectedProductName: s.selectedProductNameSnapshot,
        supplementPriceCents: s.supplementPriceCents,
        quantity: s.quantity,
      })),
      platterComponents: line.platterComponents.map((c): RestaurantOrderPlatterComponentView => ({
        componentName: c.componentNameSnapshot,
        removed: c.removed,
        replacementName: c.replacementNameSnapshot,
        priceDeltaCents: c.priceDeltaCents,
      })),
    };
  }

  private buildSignature(command: AddOrderLineCommand): string {
    return [
      command.restaurantProductId,
      ...command.modifiers
        .map((m) => `m:${m.modifierGroupId}:${m.modifierOptionId}:${m.quantity}`)
        .sort(),
      ...command.comboSlots
        .map((s) => `cs:${s.comboSlotId}:${s.restaurantProductId}:${s.quantity}`)
        .sort(),
      ...command.platterComponents
        .map((p) => `pc:${p.platterComponentId}:${p.included}`)
        .sort(),
      command.kitchenNote ?? '',
    ].join('|');
  }

  private mapPayment(p: RawPayment): RestaurantOrderPaymentView {
    return {
      id: p.id,
      method: p.method as PaymentMethod,
      amountCents: p.amountCents,
      status: p.status as RestaurantOrderPaymentView['status'],
      paidAt: p.paidAt?.toISOString() ?? null,
    };
  }
}
