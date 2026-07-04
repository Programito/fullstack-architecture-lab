import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import type { AuditService } from '../../../observability/application/audit.service';
import type { RealtimeOrderEventPublisher } from '../../application/ports/realtime-order-event-publisher.port';
import type { RestaurantOrderView } from '../../domain/restaurant-order.models';
import type { ServicePointDetailView } from '../../domain/service-floor.models';
import { ok } from '../../../shared/result/result';
import { RestaurantOrderController } from './restaurant-order.controller';

const RESTAURANT_ID = 'restaurant-mesaflow-centro';
const TABLE_ID = 'table-1';

function makeOrderView(overrides: Partial<RestaurantOrderView['order']> = {}): RestaurantOrderView {
  return {
    order: {
      id: 'order-1',
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      status: 'open',
      currency: 'EUR',
      guestCount: 2,
      subtotalCents: 0,
      taxCents: 0,
      discountTotalCents: 0,
      totalCents: 0,
      paidCents: 0,
      balanceCents: 0,
      openedAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      closedAt: null,
      ...overrides,
    },
    lines: [],
    payments: [],
  };
}

function makeServicePointDetail(): ServicePointDetailView {
  return {
    table: {
      id: TABLE_ID,
      tableNumber: 1,
      name: 'Mesa 1',
      capacity: 2,
      status: 'occupied',
      occupiedAt: '2026-07-04T10:00:00.000Z',
      serviceStartedAt: '2026-07-04T10:00:00.000Z',
    },
    floorElement: null,
    serviceInfo: {
      guestCount: 2,
      lineCount: 1,
      totalCents: 1000,
      currency: 'EUR',
      servicePhase: { course: 'mains', status: 'in_progress' },
      durationMinutes: 10,
    },
  } as ServicePointDetailView;
}

function makeRequest(): AuthenticatedRequest {
  return {
    auth: {
      userId: 'user-1',
      sessionId: 'session-1',
      accountType: 'regular',
      roles: [],
      permissions: [],
      scopes: { organizations: [], restaurants: [RESTAURANT_ID] },
      restaurantPermissions: {},
      organizationPermissions: {},
    },
  } as unknown as AuthenticatedRequest;
}

function makeResponse() {
  return { status: vi.fn().mockReturnThis() };
}

function makeController() {
  const useCases = {
    openRestaurantOrder: { execute: vi.fn() },
    addRestaurantOrderLine: { execute: vi.fn() },
    updateRestaurantOrderLine: { execute: vi.fn() },
    deleteRestaurantOrderLine: { execute: vi.fn() },
    cancelRestaurantOrderLine: { execute: vi.fn() },
    updateRestaurantOrderLineStatus: { execute: vi.fn() },
    freeRestaurantServicePoint: { execute: vi.fn() },
    registerRestaurantOrderPayment: { execute: vi.fn() },
    chargeRestaurantServicePoint: { execute: vi.fn() },
    sendRestaurantServicePointOrderToKitchen: { execute: vi.fn() },
    markRestaurantServicePointOrderServed: { execute: vi.fn() },
  };
  const audit = { record: vi.fn() } as unknown as AuditService;
  const realtime = { publishOrderInvalidated: vi.fn() } as unknown as RealtimeOrderEventPublisher;

  const controller = new RestaurantOrderController(
    useCases.openRestaurantOrder as any,
    useCases.addRestaurantOrderLine as any,
    useCases.updateRestaurantOrderLine as any,
    useCases.deleteRestaurantOrderLine as any,
    useCases.cancelRestaurantOrderLine as any,
    useCases.updateRestaurantOrderLineStatus as any,
    useCases.freeRestaurantServicePoint as any,
    useCases.registerRestaurantOrderPayment as any,
    useCases.chargeRestaurantServicePoint as any,
    useCases.sendRestaurantServicePointOrderToKitchen as any,
    useCases.markRestaurantServicePointOrderServed as any,
    audit,
    realtime,
  );

  return { controller, ...useCases, audit, realtime };
}

describe('RestaurantOrderController realtime invalidation', () => {
  it('publica order.opened tras abrir un pedido', async () => {
    const { controller, openRestaurantOrder, realtime } = makeController();
    openRestaurantOrder.execute.mockResolvedValue(ok({ order: makeOrderView(), created: true }));

    await controller.openOrder(RESTAURANT_ID, TABLE_ID, { guestCount: 2 }, makeRequest(), makeResponse() as any);

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: 'order-1',
      reason: 'order.opened',
    });
  });

  it('publica order.line.created tras añadir una línea', async () => {
    const { controller, addRestaurantOrderLine, realtime } = makeController();
    addRestaurantOrderLine.execute.mockResolvedValue(ok(makeOrderView()));

    await controller.addOrderLine(
      RESTAURANT_ID,
      'order-1',
      { restaurantProductId: 'product-1', quantity: 1 } as any,
      makeRequest(),
    );

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: 'order-1',
      reason: 'order.line.created',
    });
  });

  it('publica order.line.updated tras editar una línea', async () => {
    const { controller, updateRestaurantOrderLine, realtime } = makeController();
    updateRestaurantOrderLine.execute.mockResolvedValue(ok(makeOrderView()));

    await controller.updateOrderLine(RESTAURANT_ID, 'order-1', 'line-1', { quantity: 2 } as any, makeRequest());

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: 'order-1',
      reason: 'order.line.updated',
    });
  });

  it('publica order.line.deleted tras eliminar una línea', async () => {
    const { controller, deleteRestaurantOrderLine, realtime } = makeController();
    deleteRestaurantOrderLine.execute.mockResolvedValue(ok(makeOrderView()));

    await controller.deleteOrderLine(RESTAURANT_ID, 'order-1', 'line-1', makeRequest());

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: 'order-1',
      reason: 'order.line.deleted',
    });
  });

  it('publica order.line.cancelled tras cancelar una línea', async () => {
    const { controller, cancelRestaurantOrderLine, realtime } = makeController();
    cancelRestaurantOrderLine.execute.mockResolvedValue(ok(makeOrderView()));

    await controller.cancelOrderLine(RESTAURANT_ID, 'order-1', 'line-1', { reason: 'cliente canceló' }, makeRequest());

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: 'order-1',
      reason: 'order.line.cancelled',
    });
  });

  it('registra auditoría y publica order.line.status-updated tras cambiar el estado de una línea', async () => {
    const { controller, updateRestaurantOrderLineStatus, audit, realtime } = makeController();
    updateRestaurantOrderLineStatus.execute.mockResolvedValue(ok(makeOrderView()));

    await controller.updateOrderLineStatus(
      RESTAURANT_ID,
      'order-1',
      'line-1',
      { status: 'preparing' } as any,
      makeRequest(),
    );

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'order.line.status-updated', entityId: 'order-1' }),
    );
    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: 'order-1',
      reason: 'order.line.status-updated',
    });
  });

  it('publica order.payment.recorded tras registrar un pago', async () => {
    const { controller, registerRestaurantOrderPayment, realtime } = makeController();
    registerRestaurantOrderPayment.execute.mockResolvedValue(ok(makeOrderView()));

    await controller.registerPayment(RESTAURANT_ID, 'order-1', { amountCents: 500, method: 'cash' } as any, makeRequest());

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: 'order-1',
      reason: 'order.payment.recorded',
    });
  });

  it('publica order.service-point.sent-to-kitchen tras enviar la mesa a cocina', async () => {
    const { controller, sendRestaurantServicePointOrderToKitchen, realtime } = makeController();
    sendRestaurantServicePointOrderToKitchen.execute.mockResolvedValue(ok(makeServicePointDetail()));

    await controller.sendServicePointToKitchen(RESTAURANT_ID, TABLE_ID, makeRequest());

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: null,
      reason: 'order.service-point.sent-to-kitchen',
    });
  });

  it('publica order.service-point.marked-served tras marcar la mesa como servida', async () => {
    const { controller, markRestaurantServicePointOrderServed, realtime } = makeController();
    markRestaurantServicePointOrderServed.execute.mockResolvedValue(ok(makeServicePointDetail()));

    await controller.markServicePointServed(RESTAURANT_ID, TABLE_ID, makeRequest());

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: null,
      reason: 'order.service-point.marked-served',
    });
  });

  it('publica order.service-point.charged tras cobrar la mesa', async () => {
    const { controller, chargeRestaurantServicePoint, realtime } = makeController();
    chargeRestaurantServicePoint.execute.mockResolvedValue(ok(makeServicePointDetail()));

    await controller.chargeServicePoint(RESTAURANT_ID, TABLE_ID, makeRequest());

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: null,
      reason: 'order.service-point.charged',
    });
  });

  it('publica order.service-point.freed tras liberar la mesa', async () => {
    const { controller, freeRestaurantServicePoint, realtime } = makeController();
    freeRestaurantServicePoint.execute.mockResolvedValue(ok(makeServicePointDetail()));

    await controller.freeServicePoint(RESTAURANT_ID, TABLE_ID, makeRequest());

    expect(realtime.publishOrderInvalidated).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_ID,
      orderId: null,
      reason: 'order.service-point.freed',
    });
  });
});
