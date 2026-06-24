import { Injectable } from '@nestjs/common';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { calculateOrderTotals, calculatePaymentSummary, includedTaxCents } from '../../domain/order-pricing';
import type {
  AddOrderLineCommand,
  CancelOrderLineCommand,
  DeleteOrderLineCommand,
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
  createdAt: Date;
  updatedAt: Date;
  lines: RawOrderLine[];
  payments: RawPayment[];
};

// ── Catalog types for addLine validation ──────────────────────────────────────

type RawCatalogModifierOption = { id: string; name: string; priceDeltaCents: number };
type RawCatalogModifierGroup = { id: string; name: string; options: RawCatalogModifierOption[] };
type RawCatalogRpModifierGroup = { modifierGroupId: string; modifierGroup: RawCatalogModifierGroup };

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
};

const ORDER_INCLUDE = {
  lines: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      modifiers: true,
      comboSlots: true,
      platterComponents: true,
    },
  },
  payments: {
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

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

  async open(command: OpenRestaurantOrderCommand): Promise<RestaurantOrderView> {
    return this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUniqueOrThrow({ where: { id: command.restaurantId } });
      const created = await tx.order.create({
        data: {
          restaurantId: command.restaurantId,
          tableId: command.tableId,
          openedByUserId: command.openedByUserId,
          status: 'open',
          currency: restaurant.currency,
          guestCount: command.guestCount,
          subtotalCents: 0,
          taxCents: 0,
          discountTotalCents: 0,
          totalCents: 0,
        },
        include: ORDER_INCLUDE,
      });
      return this.mapOrder(created as unknown as RawOrder);
    });
  }

  async addLine(command: AddOrderLineCommand): Promise<RestaurantOrderView> {
    return this.prisma.$transaction(async (tx) => {
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
          priceDeltaCents: option.priceDeltaCents,
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
      const finalOrder = await tx.order.findUniqueOrThrow({
        where: { id: command.orderId },
        include: ORDER_INCLUDE,
      });
      return this.mapOrder(finalOrder as unknown as RawOrder);
    });
  }

  updatePendingLine(_command: UpdateOrderLineCommand): Promise<RestaurantOrderView> {
    throw new Error('Not implemented yet — will be added in Task 6.');
  }

  deletePendingLine(_command: DeleteOrderLineCommand): Promise<RestaurantOrderView> {
    throw new Error('Not implemented yet — will be added in Task 6.');
  }

  cancelLine(_command: CancelOrderLineCommand): Promise<RestaurantOrderView> {
    throw new Error('Not implemented yet — will be added in Task 6.');
  }

  sendPendingLinesToKitchen(_restaurantId: string, _tableId: string): Promise<RestaurantOrderView | null> {
    throw new Error('Not implemented yet — will be added in Task 7.');
  }

  markActiveLinesServed(_restaurantId: string, _tableId: string): Promise<RestaurantOrderView | null> {
    throw new Error('Not implemented yet — will be added in Task 7.');
  }

  registerPayment(_command: RegisterOrderPaymentCommand): Promise<RestaurantOrderView> {
    throw new Error('Not implemented yet — will be added in Task 8.');
  }

  private mapOrder(raw: RawOrder): RestaurantOrderView {
    const { paidCents, balanceCents } = calculatePaymentSummary(
      raw.totalCents,
      raw.payments.map((p) => ({ amountCents: p.amountCents, status: p.status })),
    );

    return {
      order: {
        id: raw.id,
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
      status: line.status as OrderLineStatus,
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

