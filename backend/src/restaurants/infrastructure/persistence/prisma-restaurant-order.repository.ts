import { Injectable } from '@nestjs/common';

import { calculatePaymentSummary } from '../../domain/order-pricing';
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

  addLine(_command: AddOrderLineCommand): Promise<RestaurantOrderView> {
    throw new Error('Not implemented yet — will be added in Task 5.');
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
