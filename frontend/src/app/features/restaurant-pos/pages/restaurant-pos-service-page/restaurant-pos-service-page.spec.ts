import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import { of, Subject, throwError } from 'rxjs';
import englishTranslations from '../../../../../../public/i18n/en.json';
import spanishTranslations from '../../../../../../public/i18n/es.json';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { KEY_VALUE_STORAGE, MemoryKeyValueStorage, type KeyValueStorage } from '../../../../shared/utils/storage/key-value-storage';
import { mapServicePointOrder } from '../../api/restaurant-pos-api.mappers';
import type { ServiceFloorDto, ServicePointDetailDto } from '../../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { MOCK_FLOOR_ELEMENTS, MOCK_RESTAURANT_TABLES } from '../../state/restaurant-pos.mock-data';
import { OrderWriteService } from '../../state/order-write.service';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantFloorLoader } from '../../state/restaurant-floor-loader.service';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosServicePage } from './restaurant-pos-service-page';

describe('RestaurantPosServicePage', () => {
  // Fija el reloj: varios fixtures usan fechas absolutas ('2026-06-22', '2026-07-17'...)
  // para representar líneas recientes o antiguas frente a isStaleKitchenLine (24h). Sin
  // fijar Date.now(), el paso del tiempo real las va convirtiendo en obsoletas y los
  // tests empiezan a fallar de forma intermitente según cuándo se ejecuten.
  beforeEach(() => {
    // Solo se falsea Date: los setTimeout/debounce reales de la página (búsqueda,
    // sincronización de productos directos) deben seguir corriendo con normalidad.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-17T14:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  type ServiceOrderRecord = {
    order: {
      id: string;
      tableId: string;
      status: 'open' | 'sent_to_kitchen' | 'served' | 'payment_pending' | 'paid';
      openedAt: string;
      updatedAt: string;
      subtotalCents: number;
      taxCents: number;
      totalCents: number;
      currency: string;
    };
    lines: Array<{
      id: string;
      restaurantProductId?: string | null;
      productId?: string | null;
      productName: string;
      productType: 'simple' | 'combo' | 'platter';
      preparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
      quantity: number;
      unitPriceCents: number;
      subtotalCents: number;
      configurationSignature?: string;
      status: 'pending' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'picked_up' | 'served' | 'cancelled';
      course: 'drinks' | 'starters' | 'mains' | 'desserts' | 'mixed' | 'none';
      kitchenNote: string | null;
      updatedAt: string;
      modifiers: Array<{ groupName: string; optionName: string; priceDeltaCents: number; quantity: number }>;
      comboSlots: Array<{ slotName: string; selectedProductName: string; supplementPriceCents: number; quantity: number }>;
    }>;
  };

  const createDefaultServiceFloorResponse = (): ServiceFloorDto => ({
    restaurantId: 'restaurant-mesaflow-centro',
    floor: {
      id: 'floor-main',
      name: 'Sala principal',
      rows: 20,
      columns: 20,
    },
    elements: MOCK_FLOOR_ELEMENTS.map((element) => ({
      id: element.id,
      type: element.type,
      label: element.label,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      shape: element.shape ?? null,
      tableId: element.tableId ?? null,
    })),
    servicePoints: MOCK_FLOOR_ELEMENTS.filter((element) => element.tableId).map((element) => {
      const table = MOCK_RESTAURANT_TABLES.find((candidate) => candidate.id === element.tableId)!;
      return {
        table: {
          id: table.id,
          tableNumber: table.number,
          name: null,
          capacity: table.capacity,
          status: table.status,
          serviceStartedAt: null,
        },
        summary: {
          lineCount: 0,
          guestCount: table.capacity,
          totalCents: 0,
          currency: 'EUR',
          servicePhase: {
            course: 'none' as const,
            status: 'no_order' as const,
          },
        },
      };
    }),
    totals: {
      servicePointCount: 5,
      occupiedCount: 0,
      openOrderCount: 0,
    },
  });

  type RestaurantPosApiMock = Pick<
    RestaurantPosApiService,
    | 'listRestaurants'
    | 'getRestaurantMenu'
    | 'getRestaurantServiceFloor'
    | 'getRestaurantServicePoint'
    | 'getRestaurantServicePointOrder'
    | 'occupyRestaurantServicePoint'
    | 'sendRestaurantServicePointToKitchen'
    | 'markRestaurantServicePointServed'
    | 'updateRestaurantOrderLine'
    | 'updateRestaurantOrderLineStatus'
    | 'deleteRestaurantOrderLine'
    | 'cancelRestaurantOrderLine'
    | 'chargeRestaurantServicePoint'
    | 'registerRestaurantOrderPayment'
    | 'freeRestaurantServicePoint'
  > & {
    __setServiceOrder: (tableId: string, record: ServiceOrderRecord) => void;
  };

  const createRestaurantPosApiMock = (): RestaurantPosApiMock => {
    const tableStatuses = new Map<string, 'free' | 'occupied' | 'waiting_kitchen' | 'served' | 'payment_pending' | 'paid'>([
      ['table-1', 'free'],
      ['table-2', 'free'],
      ['table-3', 'free'],
      ['table-4', 'free'],
      ['stool-1', 'free'],
      ['stool-2', 'free'],
      ['stool-3', 'free'],
    ]);
    const serviceOrders = new Map<string, ServiceOrderRecord>([
      [
        'table-1',
        {
          order: {
            id: 'order:table-1',
            tableId: 'table-1',
            status: 'open',
            openedAt: '2026-06-22T10:00:00.000Z',
            updatedAt: '2026-06-22T10:00:00.000Z',
            subtotalCents: 0,
            taxCents: 0,
            totalCents: 0,
            currency: 'EUR',
          },
          lines: [],
        },
      ],
    ]);

    const setServiceOrder = (tableId: string, record: ServiceOrderRecord) => {
      serviceOrders.set(tableId, record);
      const hasKitchenLines = record.lines.some((line) =>
        line.status === 'sent_to_kitchen' || line.status === 'preparing' || line.status === 'ready',
      );
      tableStatuses.set(tableId, hasKitchenLines ? 'waiting_kitchen' : 'occupied');
    };

    const toRestaurantOrderDto = (tableId: string, currentOrder: ServiceOrderRecord) => ({
      order: {
        id: currentOrder.order.id,
        restaurantId: 'restaurant-mesaflow-centro',
        tableId,
        status: currentOrder.order.status === 'paid' ? 'paid' as const : 'open' as const,
        currency: currentOrder.order.currency,
        guestCount: 4,
        subtotalCents: currentOrder.order.subtotalCents,
        taxCents: currentOrder.order.taxCents,
        discountTotalCents: 0,
        totalCents: currentOrder.order.totalCents,
        paidCents: currentOrder.order.status === 'paid' ? currentOrder.order.totalCents : 0,
        balanceCents: currentOrder.order.status === 'paid' ? 0 : currentOrder.order.totalCents,
        openedAt: currentOrder.order.openedAt,
        updatedAt: currentOrder.order.updatedAt,
        closedAt: currentOrder.order.status === 'paid' ? currentOrder.order.updatedAt : null,
      },
      lines: [],
      payments: [],
    });

    return ({
    listRestaurants: vi.fn(() =>
      of([
        {
          id: 'restaurant-mesaflow-centro',
          organizationId: 'org-demo',
          name: 'MesaFlow Centro',
          displayName: 'MesaFlow Centro',
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          isActive: true,
        },
      ]),
    ),
    getRestaurantMenu: vi.fn(() =>
      of({
        id: 'menu-1',
        restaurantId: 'restaurant-mesaflow-centro',
        name: 'Carta',
        isActive: true,
        sections: [],
      }),
    ),
    getRestaurantServiceFloor: vi.fn(() =>
      of({
        restaurantId: 'restaurant-mesaflow-centro',
        floor: {
          id: 'floor-main',
          name: 'Sala principal',
          rows: 20,
          columns: 20,
        },
        elements: MOCK_FLOOR_ELEMENTS.map((element) => ({
          id: element.id,
          type: element.type,
          label: element.label,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          shape: element.shape ?? null,
          tableId: element.tableId ?? null,
        })),
        servicePoints: MOCK_FLOOR_ELEMENTS.filter((element) => element.tableId).map((element) => {
          const table = MOCK_RESTAURANT_TABLES.find((candidate) => candidate.id === element.tableId)!;
          return {
            table: {
              id: table.id,
              tableNumber: table.number,
              name: null,
              capacity: table.capacity,
              status: tableStatuses.get(table.id) ?? table.status,
              serviceStartedAt: tableStatuses.get(table.id) === 'free' ? null : '2026-06-22T10:15:00.000Z',
            },
            summary: {
              lineCount: serviceOrders.get(table.id)?.lines.length ?? 0,
              guestCount: table.capacity,
              totalCents: serviceOrders.get(table.id)?.order.totalCents ?? 0,
              currency: 'EUR',
              servicePhase: {
                course: (serviceOrders.get(table.id)?.lines.length ?? 0) > 0 ? ('mains' as const) : ('none' as const),
                status: (serviceOrders.get(table.id)?.lines.length ?? 0) > 0 ? ('pending' as const) : ('no_order' as const),
              },
            },
          };
        }),
        totals: {
          servicePointCount: 5,
          occupiedCount: 0,
          openOrderCount: 0,
        },
      }),
    ),
    getRestaurantServicePoint: vi.fn((_restaurantId: string, tableId: string) => {
      const table = MOCK_RESTAURANT_TABLES.find((candidate) => candidate.id === tableId)!;
      const element = MOCK_FLOOR_ELEMENTS.find((candidate) => candidate.tableId === tableId) ?? null;

      return of({
        table: {
          id: table.id,
          tableNumber: table.number,
          name: null,
          capacity: table.capacity,
          status: tableStatuses.get(table.id) ?? table.status,
          occupiedAt: tableStatuses.get(table.id) === 'free' ? null : '2026-06-22T10:15:00.000Z',
          serviceStartedAt: tableStatuses.get(table.id) === 'free' ? null : '2026-06-22T10:15:00.000Z',
        },
        floorElement: element
          ? {
              id: element.id,
              label: element.label,
              type: element.type,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              shape: element.shape ?? null,
            }
          : null,
        serviceInfo: {
          guestCount: table.capacity,
          lineCount: serviceOrders.get(tableId)?.lines.length ?? 0,
          totalCents: serviceOrders.get(tableId)?.order.totalCents ?? 0,
          currency: 'EUR',
          servicePhase: {
            course: (serviceOrders.get(tableId)?.lines.length ?? 0) > 0 ? ('mains' as const) : ('none' as const),
            status: (serviceOrders.get(tableId)?.lines.length ?? 0) > 0 ? ('pending' as const) : ('no_order' as const),
          },
          durationMinutes: 0,
        },
      });
    }),
    getRestaurantServicePointOrder: vi.fn((_: string, tableId: string) =>
      of(
        serviceOrders.get(tableId) ?? {
          order: {
            id: `order:${tableId}`,
            tableId,
            status: 'open' as const,
            openedAt: '2026-06-22T10:00:00.000Z',
            updatedAt: '2026-06-22T10:00:00.000Z',
            subtotalCents: 0,
            taxCents: 0,
            totalCents: 0,
            currency: 'EUR',
          },
          lines: [],
        },
      ),
    ),
    occupyRestaurantServicePoint: vi.fn((_restaurantId: string, tableId: string) => {
      tableStatuses.set(tableId, 'occupied');
      const table = MOCK_RESTAURANT_TABLES.find((candidate) => candidate.id === tableId)!;
      const element = MOCK_FLOOR_ELEMENTS.find((candidate) => candidate.tableId === tableId) ?? null;

      return of({
        table: {
          id: table.id,
          tableNumber: table.number,
          name: null,
          capacity: table.capacity,
          status: 'occupied' as const,
          occupiedAt: '2026-06-22T10:15:00.000Z',
          serviceStartedAt: '2026-06-22T10:15:00.000Z',
        },
        floorElement: element
          ? {
              id: element.id,
              label: element.label,
              type: element.type,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              shape: element.shape ?? null,
            }
          : null,
        serviceInfo: {
          guestCount: table.capacity,
          lineCount: 0,
          totalCents: 0,
          currency: 'EUR',
          servicePhase: {
            course: 'none' as const,
            status: 'no_order' as const,
          },
          durationMinutes: 0,
        },
      });
    }),
    sendRestaurantServicePointToKitchen: vi.fn((_restaurantId: string, tableId: string) => {
      tableStatuses.set(tableId, 'waiting_kitchen');
      serviceOrders.set(tableId, {
        order: {
          id: `order:${tableId}`,
          tableId,
          status: 'sent_to_kitchen',
          openedAt: '2026-06-22T10:00:00.000Z',
          updatedAt: '2026-06-22T10:05:00.000Z',
          subtotalCents: 1250,
          taxCents: 0,
          totalCents: 1250,
          currency: 'EUR',
        },
        lines: [
          {
            id: 'line-table-1-burger',
            restaurantProductId: 'product-1',
            productId: 'product-1',
            productName: 'Hamburguesa craft',
            productType: 'simple' as const,
            preparationRoute: 'kitchen' as const,
            quantity: 1,
            unitPriceCents: 1250,
            subtotalCents: 1250,
            status: 'sent_to_kitchen' as const,
            course: 'mains' as const,
            kitchenNote: null,
            // Fecha reciente a propósito: fechas fijas del pasado activan el auto-marcado
            // de líneas de cocina obsoletas (isStaleKitchenLine, 24h) y rompen el test.
            updatedAt: new Date().toISOString(),
            modifiers: [],
            comboSlots: [],
          },
        ],
      });
      const table = MOCK_RESTAURANT_TABLES.find((candidate) => candidate.id === tableId)!;
      const element = MOCK_FLOOR_ELEMENTS.find((candidate) => candidate.tableId === tableId) ?? null;

      return of({
        table: {
          id: table.id,
          tableNumber: table.number,
          name: null,
          capacity: table.capacity,
          status: 'waiting_kitchen' as const,
          occupiedAt: '2026-06-22T10:15:00.000Z',
          serviceStartedAt: '2026-06-22T10:15:00.000Z',
        },
        floorElement: element
          ? {
              id: element.id,
              label: element.label,
              type: element.type,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              shape: element.shape ?? null,
            }
          : null,
        serviceInfo: {
          guestCount: table.capacity,
          lineCount: serviceOrders.get(tableId)?.lines.length ?? 0,
          totalCents: serviceOrders.get(tableId)?.order.totalCents ?? 0,
          currency: 'EUR',
          servicePhase: {
            course: (serviceOrders.get(tableId)?.lines.length ?? 0) > 0 ? ('mains' as const) : ('none' as const),
            status: (serviceOrders.get(tableId)?.lines.length ?? 0) > 0 ? ('pending' as const) : ('no_order' as const),
          },
          durationMinutes: 0,
        },
      });
    }),
    markRestaurantServicePointServed: vi.fn((_restaurantId: string, tableId: string) => {
      tableStatuses.set(tableId, 'served');
      const currentOrder = serviceOrders.get(tableId);
      if (currentOrder) {
        serviceOrders.set(tableId, {
          order: {
            ...currentOrder.order,
            status: 'served',
            updatedAt: '2026-06-22T10:12:00.000Z',
          },
          lines: currentOrder.lines.map((line) => ({
            ...line,
            status: 'sent_to_kitchen',
          })),
        });
      }
      const table = MOCK_RESTAURANT_TABLES.find((candidate) => candidate.id === tableId)!;
      const element = MOCK_FLOOR_ELEMENTS.find((candidate) => candidate.tableId === tableId) ?? null;

      return of({
        table: {
          id: table.id,
          tableNumber: table.number,
          name: null,
          capacity: table.capacity,
          status: 'served' as const,
          occupiedAt: '2026-06-22T10:15:00.000Z',
          serviceStartedAt: '2026-06-22T10:15:00.000Z',
        },
        floorElement: element
          ? {
              id: element.id,
              label: element.label,
              type: element.type,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              shape: element.shape ?? null,
            }
          : null,
        serviceInfo: {
          guestCount: table.capacity,
          lineCount: currentOrder?.lines.length ?? 0,
          totalCents: currentOrder?.order.totalCents ?? 0,
          currency: 'EUR',
          servicePhase: {
            course: 'none' as const,
            status: 'served' as const,
          },
          durationMinutes: 0,
        },
      });
    }),
    updateRestaurantOrderLine: vi.fn((_restaurantId: string, orderId: string, lineId: string, body: { quantity?: number; kitchenNote?: string | null }) => {
      const entry = [...serviceOrders.entries()].find(([, order]) => order.order.id === orderId);
      if (!entry) {
        throw new Error(`Missing order ${orderId}`);
      }

      const [tableId, currentOrder] = entry;
      const nextLines = currentOrder.lines
        .map((line) => {
          if (line.id !== lineId) {
            return line;
          }

          if (body.quantity !== undefined && body.quantity <= 0) {
            return null;
          }

          const quantity = body.quantity ?? line.quantity;
          const unitPriceCents = line.quantity > 0 ? Math.round(line.subtotalCents / line.quantity) : line.unitPriceCents;
          return {
            ...line,
            quantity,
            subtotalCents: unitPriceCents * quantity,
            kitchenNote: body.kitchenNote !== undefined ? body.kitchenNote : line.kitchenNote,
            updatedAt: '2026-07-17T10:09:00.000Z',
          };
        })
        .filter((line): line is ServiceOrderRecord['lines'][number] => line !== null);
      const nextTotalCents = nextLines.reduce((sum, line) => sum + line.subtotalCents, 0);
      const nextStatus =
        currentOrder.order.status === 'sent_to_kitchen' || currentOrder.order.status === 'served' || currentOrder.order.status === 'paid'
          ? currentOrder.order.status
          : 'open';

      const nextOrder: ServiceOrderRecord = {
        order: {
          ...currentOrder.order,
          status: nextStatus,
          subtotalCents: nextTotalCents,
          totalCents: nextTotalCents,
          updatedAt: '2026-07-17T10:09:00.000Z',
        },
        lines: nextLines,
      };
      serviceOrders.set(tableId, nextOrder);

      return of(toRestaurantOrderDto(tableId, nextOrder));
    }),
    updateRestaurantOrderLineStatus: vi.fn((_restaurantId: string, orderId: string, lineId: string, status: 'sent_to_kitchen' | 'preparing' | 'ready' | 'served') => {
      const entry = [...serviceOrders.entries()].find(([, order]) => order.order.id === orderId);
      if (!entry) {
        throw new Error(`Missing order ${orderId}`);
      }

      const [tableId, currentOrder] = entry;
      const nextLines = currentOrder.lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              status,
              updatedAt: '2026-07-16T10:09:00.000Z',
            }
          : line,
      );
      const allServed = nextLines.every((line) => line.status === 'served' || line.status === 'cancelled');

      serviceOrders.set(tableId, {
        order: {
          ...currentOrder.order,
          status: allServed ? 'served' : currentOrder.order.status,
          updatedAt: '2026-07-16T10:09:00.000Z',
        },
        lines: nextLines,
      });
      tableStatuses.set(tableId, allServed ? 'served' : (currentOrder.order.status === 'sent_to_kitchen' ? 'waiting_kitchen' : tableStatuses.get(tableId) ?? 'occupied'));

      return of(toRestaurantOrderDto(tableId, serviceOrders.get(tableId)!));
    }),
    deleteRestaurantOrderLine: vi.fn((_restaurantId: string, orderId: string, lineId: string) => {
      const entry = [...serviceOrders.entries()].find(([, order]) => order.order.id === orderId);
      if (!entry) {
        return of(void 0);
      }

      const [tableId, currentOrder] = entry;
      const targetLine = currentOrder.lines.find((line) => line.id === lineId);

      if (!targetLine || targetLine.status !== 'pending') {
        return of(void 0);
      }

      const nextLines = currentOrder.lines.filter((line) => line.id !== lineId);
      serviceOrders.set(tableId, {
        order: {
          ...currentOrder.order,
          updatedAt: '2026-06-22T10:08:00.000Z',
          totalCents: nextLines.reduce((sum, line) => sum + line.subtotalCents, 0),
          subtotalCents: nextLines.reduce((sum, line) => sum + line.subtotalCents, 0),
        },
        lines: nextLines,
      });

      return of(void 0);
    }),
    cancelRestaurantOrderLine: vi.fn((_restaurantId: string, orderId: string, lineId: string) => {
      const entry = [...serviceOrders.entries()].find(([, order]) => order.order.id === orderId);
      if (!entry) {
        throw new Error(`Missing order ${orderId}`);
      }

      const [tableId, currentOrder] = entry;
      const nextLines = currentOrder.lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              status: 'cancelled' as const,
              updatedAt: '2026-06-22T10:09:00.000Z',
            }
          : line,
      );
      serviceOrders.set(tableId, {
        order: {
          ...currentOrder.order,
          updatedAt: '2026-06-22T10:09:00.000Z',
        },
        lines: nextLines,
      });

      return of(toRestaurantOrderDto(tableId, serviceOrders.get(tableId)!));
    }),
    chargeRestaurantServicePoint: vi.fn((_restaurantId: string, tableId: string) => {
      tableStatuses.set(tableId, 'payment_pending');
      const currentOrder = serviceOrders.get(tableId);
      if (currentOrder) {
        serviceOrders.set(tableId, {
          order: {
            ...currentOrder.order,
            status: 'payment_pending',
            updatedAt: '2026-06-22T10:14:00.000Z',
          },
          lines: currentOrder.lines,
        });
      }
      const table = MOCK_RESTAURANT_TABLES.find((candidate) => candidate.id === tableId)!;
      const element = MOCK_FLOOR_ELEMENTS.find((candidate) => candidate.tableId === tableId) ?? null;

      return of({
        table: {
          id: table.id,
          tableNumber: table.number,
          name: null,
          capacity: table.capacity,
          status: 'payment_pending' as const,
          occupiedAt: '2026-06-22T10:15:00.000Z',
          serviceStartedAt: '2026-06-22T10:15:00.000Z',
        },
        floorElement: element
          ? {
              id: element.id,
              label: element.label,
              type: element.type,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              shape: element.shape ?? null,
            }
          : null,
        serviceInfo: {
          guestCount: table.capacity,
          lineCount: currentOrder?.lines.length ?? 0,
          totalCents: currentOrder?.order.totalCents ?? 0,
          currency: 'EUR',
          servicePhase: {
            course: 'mains' as const,
            status: 'served' as const,
          },
          durationMinutes: 0,
        },
      });
    }),
    registerRestaurantOrderPayment: vi.fn((_restaurantId: string, orderId: string, amountCents: number, method: 'cash' | 'card' | 'bizum') => {
      const [tableId, currentOrder] =
        [...serviceOrders.entries()].find(([, order]) => order.order.id === orderId) ?? [];

      if (!tableId || !currentOrder) {
        throw new Error(`Missing order ${orderId}`);
      }

      tableStatuses.set(tableId, 'paid');
      serviceOrders.set(tableId, {
        order: {
          ...currentOrder.order,
          status: 'paid',
          updatedAt: '2026-06-22T10:15:00.000Z',
        },
        lines: currentOrder.lines,
      });

      return of({
        order: {
          id: currentOrder.order.id,
          restaurantId: 'restaurant-mesaflow-centro',
          tableId,
          status: 'paid' as const,
          currency: currentOrder.order.currency,
          guestCount: 4,
          subtotalCents: currentOrder.order.subtotalCents,
          taxCents: currentOrder.order.taxCents,
          discountTotalCents: 0,
          totalCents: currentOrder.order.totalCents,
          paidCents: amountCents,
          balanceCents: 0,
          openedAt: currentOrder.order.openedAt,
          updatedAt: '2026-06-22T10:15:00.000Z',
          closedAt: '2026-06-22T10:15:00.000Z',
        },
        lines: [],
        payments: [
          {
            id: 'payment-1',
            method,
            amountCents,
            status: 'completed' as const,
            paidAt: '2026-06-22T10:15:00.000Z',
          },
        ],
      });
    }),
    freeRestaurantServicePoint: vi.fn((_restaurantId: string, tableId: string) => {
      tableStatuses.set(tableId, 'free');
      const table = MOCK_RESTAURANT_TABLES.find((candidate) => candidate.id === tableId)!;
      const element = MOCK_FLOOR_ELEMENTS.find((candidate) => candidate.tableId === tableId) ?? null;

      return of({
        table: {
          id: table.id,
          tableNumber: table.number,
          name: null,
          capacity: table.capacity,
          status: 'free' as const,
          occupiedAt: null,
          serviceStartedAt: null,
        },
        floorElement: element
          ? {
              id: element.id,
              label: element.label,
              type: element.type,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              shape: element.shape ?? null,
            }
          : null,
        serviceInfo: {
          guestCount: table.capacity,
          lineCount: 0,
          totalCents: 0,
          currency: 'EUR',
          servicePhase: {
            course: 'none' as const,
            status: 'no_order' as const,
          },
          durationMinutes: 0,
        },
      });
    }),
    __setServiceOrder: setServiceOrder,
  });
  };

  const renderServicePage = async (
    storage?: KeyValueStorage,
    apiMock = createRestaurantPosApiMock(),
    options?: {
      restaurantContext?: Pick<RestaurantContextStore, 'activeRestaurant' | 'load'>;
      floorLoader?: Pick<RestaurantFloorLoader, 'load' | 'retry'>;
    },
  ) => {
    const i18n = provideI18nTesting();
    Object.assign(i18n.translations.es.restaurantPos.service, {
      removeGroupedConfirmTitle: spanishTranslations.restaurantPos.service.removeGroupedConfirmTitle,
      removeGroupedConfirmDescription: spanishTranslations.restaurantPos.service.removeGroupedConfirmDescription,
    });
    const result = await render(RestaurantPosServicePage, {
      imports: [...i18n.imports],
      providers: [
        ...(storage ? [...i18n.providers, { provide: KEY_VALUE_STORAGE, useValue: storage }] : [...i18n.providers]),
        { provide: RestaurantPosApiService, useValue: apiMock },
        ...(options?.restaurantContext ? [{ provide: RestaurantContextStore, useValue: options.restaurantContext }] : []),
        ...(options?.floorLoader ? [{ provide: RestaurantFloorLoader, useValue: options.floorLoader }] : []),
        OrderWriteService,
      ],
    });

    result.fixture.detectChanges();
    return result;
  };

  const getProductDialog = () => screen.getByRole('dialog', { name: /Añadir productos/i });
  const queryProductDialog = () => screen.queryByRole('dialog', { name: /Añadir productos/i });

  const createServiceOrderRecord = (
    lines: ServiceOrderRecord['lines'],
    status: ServiceOrderRecord['order']['status'] = 'open',
  ): ServiceOrderRecord => ({
    order: {
      id: 'order:table-1',
      tableId: 'table-1',
      status,
      openedAt: '2026-06-22T10:00:00.000Z',
      updatedAt: '2026-06-22T10:00:00.000Z',
      subtotalCents: lines.reduce((sum, line) => sum + line.subtotalCents, 0),
      taxCents: 0,
      totalCents: lines.reduce((sum, line) => sum + line.subtotalCents, 0),
      currency: 'EUR',
    },
    lines,
  });

  const addProductFromSearch = (fixture: { detectChanges: () => void }, productName: RegExp) => {
    fireEvent.click(screen.getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();
    const dialog = getProductDialog();
    const product = within(dialog).getByText(productName).textContent ?? '';
    const action =
      within(dialog).queryByRole('button', { name: new RegExp(`Añadir una unidad de ${product}`) }) ??
      within(dialog).getByRole('button', { name: new RegExp(`Configurar ${product}`) });
    fireEvent.click(action);
    fixture.detectChanges();
    const customizer = screen.queryByRole('dialog', { name: new RegExp(product) });
    if (customizer) {
      fireEvent.click(within(customizer).getByRole('button', { name: /Añadir por/i }));
      fixture.detectChanges();
    }
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    fixture.detectChanges();
  };

  it('provides translation fixtures for the service dashboard and workflow labels', () => {
    const i18n = provideI18nTesting();

    expect(i18n.translations.es.restaurantPos.service.workflow.summary).toBeTruthy();
    expect(i18n.translations.es.restaurantPos.service.workflow.payment).toBeTruthy();
    expect(i18n.translations.es.restaurantPos.service.dashboard.occupied).toBeTruthy();
  });

  it('includes dashboard labels in the production English locale', () => {
    expect(englishTranslations.restaurantPos.service.dashboard).toEqual({
      occupied: 'Active',
      kitchen: 'In kitchen',
      charge: 'To charge',
      sales: 'Sales',
    });
  });

  it('derives compact dashboard stats for the command center header', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const component = fixture.componentInstance as unknown as {
      serviceDashboardStats(): Array<{ id: 'occupied' | 'kitchen' | 'charge' | 'sales'; value: string; tone: 'neutral' | 'warning' | 'accent' }>;
      productPickerMode(): 'drawer';
    };

    const servicePoints = store.servicePoints();
    const updates = [
      { status: 'occupied' as const, total: 12 },
      { status: 'waiting_kitchen' as const, total: 15 },
      { status: 'served' as const, total: 20 },
      { status: 'payment_pending' as const, total: 25 },
    ];

    updates.forEach((update, index) => {
      store.hydrateServicePoint({ table: { ...servicePoints[index].table, ...update } });
    });

    expect(component.serviceDashboardStats()).toEqual([
      { id: 'occupied', value: '4', tone: 'neutral' },
      { id: 'kitchen', value: '1', tone: 'warning' },
      { id: 'charge', value: '2', tone: 'accent' },
      { id: 'sales', value: '72,00\u00a0€', tone: 'accent' },
    ]);
    expect(component.productPickerMode()).toBe('drawer');
  });

  it('excludes reserved tables from the active dashboard count', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const component = fixture.componentInstance as unknown as {
      serviceDashboardStats(): Array<{ id: 'occupied' | 'kitchen' | 'charge' | 'sales'; value: string; tone: 'neutral' | 'warning' | 'accent' }>;
    };
    const [activePoint, reservedPoint] = store.servicePoints().filter((servicePoint) => servicePoint.table.status === 'free');

    store.hydrateServicePoint({ table: { ...activePoint.table, status: 'occupied' } });
    store.hydrateServicePoint({ table: { ...reservedPoint.table, status: 'reserved' } });

    expect(component.serviceDashboardStats().find((stat) => stat.id === 'occupied')).toEqual({
      id: 'occupied',
      value: '1',
      tone: 'neutral',
    });
  });

  it('renders the service page as a command center with compact metrics and a dominant floor canvas', async () => {
    const { container } = await renderServicePage();

    expect(screen.getByRole('heading', { name: 'Servicio de sala' })).toBeTruthy();
    expect(screen.getByTestId('service-dashboard-stats')).toBeTruthy();
    expect(screen.getByTestId('service-floor-canvas')).toBeTruthy();
    expect(screen.getByTestId('service-workflow-panel-shell')).toBeTruthy();
    expect(screen.getByTestId('service-workflow-panel-shell').classList.contains('2xl:sticky')).toBe(true);
    expect(screen.getByTestId('service-workflow-panel-shell').classList.contains('xl:sticky')).toBe(false);
    expect(screen.getByRole('heading', { name: 'Selecciona una mesa' })).toBeTruthy();
    expect(screen.getByText('Selecciona una mesa para empezar.')).toBeTruthy();
    expect(screen.getByLabelText('Panel de mesa seleccionada')).toBeTruthy();
    expect(screen.queryByText('Añadir rápido')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Preparación' })).toBeNull();
    expect(screen.getByRole('button', { name: /Buscar mesa\/taburete/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Cocina/i }).getAttribute('href')).toBe('/restaurant-pos/kitchen');
    expect(screen.getByLabelText('M1 mesa, Libre')).toBeTruthy();
    expect(screen.queryByRole('toolbar', { name: 'Acciones del elemento del plano' })).toBeNull();

    const pageShell = screen.getByTestId('service-floor-canvas').closest('section');
    expect(pageShell?.classList.contains('xl:grid-cols-[minmax(0,1fr)_26rem]')).toBe(true);

    const tablePanelHost = container.querySelector('app-service-table-panel');
    expect(tablePanelHost?.className).toContain('w-full');
    expect(tablePanelHost?.className).not.toMatch(/\babsolute\b|\bfixed\b/);
  });

  it('shows the shared floor spinner and no service points while loading', async () => {
    const apiMock = createRestaurantPosApiMock();
    const delayedFloor$ = new Subject<ServiceFloorDto>();
    vi.mocked(apiMock.getRestaurantServiceFloor).mockReturnValue(delayedFloor$);

    const { fixture } = await renderServicePage(undefined, apiMock);
    const component = fixture.componentInstance as unknown as {
      serviceDashboardStats(): Array<{ id: 'occupied' | 'kitchen' | 'charge' | 'sales'; value: string; tone: 'neutral' | 'warning' | 'accent' }>;
    };

    expect(screen.getByText('Cargando plano de mesas…')).toBeTruthy();
    expect(screen.getByTestId('floor-loading-state').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByTestId('floor-loading-state').querySelector('.animate-spin')?.className).toContain('motion-reduce:animate-none');
    expect(screen.queryByLabelText('M1 mesa, Libre')).toBeNull();
    expect(screen.getByRole('button', { name: /Buscar mesa\/taburete/i })).toHaveProperty('disabled', true);
    expect(component.serviceDashboardStats()).toEqual([
      { id: 'occupied', value: '0', tone: 'neutral' },
      { id: 'kitchen', value: '0', tone: 'neutral' },
      { id: 'charge', value: '0', tone: 'neutral' },
      { id: 'sales', value: '0,00\u00a0€', tone: 'accent' },
    ]);
  });

  it('shows the shared localized alert and retry action when floor loading fails', async () => {
    const apiMock = createRestaurantPosApiMock();
    vi.mocked(apiMock.getRestaurantServiceFloor).mockReturnValue(throwError(() => new Error('network')));

    await renderServicePage(undefined, apiMock);

    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(within(alert).getByText('No se pudo cargar el plano de mesas.')).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.queryByLabelText('M1 mesa, Libre')).toBeNull();
    expect(screen.getByRole('button', { name: /Buscar mesa\/taburete/i })).toHaveProperty('disabled', true);
  });

  it('retries the shared floor request and renders the emitted service floor', async () => {
    const retryResponse = new Subject<ServiceFloorDto>();
    const apiMock = createRestaurantPosApiMock();
    vi.mocked(apiMock.getRestaurantServiceFloor)
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(retryResponse);
    const { fixture } = await renderServicePage(undefined, apiMock);

    const stateContainer = screen.getByTestId('floor-load-state');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(apiMock.getRestaurantServiceFloor).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('floor-load-state')).toBe(stateContainer);
    expect(screen.getByText('Cargando plano de mesas…')).toBeTruthy();

    retryResponse.next(createDefaultServiceFloorResponse());
    retryResponse.complete();
    fixture.detectChanges();

    expect(screen.getByLabelText('M1 mesa, Libre')).toBeTruthy();
    expect(screen.queryByTestId('floor-loading-state')).toBeNull();
    expect(screen.getByRole('button', { name: /Buscar mesa\/taburete/i })).toHaveProperty('disabled', false);
  });

  it('shows the shared empty state without a floor plan or active statistics', async () => {
    const apiMock = createRestaurantPosApiMock();
    vi.mocked(apiMock.getRestaurantServiceFloor).mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    const { fixture } = await renderServicePage(undefined, apiMock);
    const component = fixture.componentInstance as unknown as {
      serviceDashboardStats(): Array<{ id: 'occupied' | 'kitchen' | 'charge' | 'sales'; value: string; tone: 'neutral' | 'warning' | 'accent' }>;
    };

    expect(screen.getByText('Todavía no hay un plano de mesas configurado.')).toBeTruthy();
    expect(screen.queryByLabelText('M1 mesa, Libre')).toBeNull();
    expect(screen.queryByTestId('floor-loading-state')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('button', { name: /Buscar mesa\/taburete/i })).toHaveProperty('disabled', true);
    expect(component.serviceDashboardStats().map((stat) => stat.value)).toEqual(['0', '0', '0', '0,00\u00a0€']);
  });

  it('tracks only the active restaurant when requesting the shared floor', async () => {
    const internalLoaderStatus = signal<'loading' | 'error'>('loading');
    const activeRestaurant = signal({
      id: 'restaurant-mesaflow-centro',
      organizationId: 'org-demo',
      name: 'MesaFlow Centro',
      displayName: 'MesaFlow Centro',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      isActive: true,
    });
    const load = vi.fn(() => internalLoaderStatus());
    const apiMock = createRestaurantPosApiMock();

    const { fixture } = await renderServicePage(undefined, apiMock, {
      restaurantContext: { activeRestaurant: activeRestaurant.asReadonly(), load: vi.fn() },
      floorLoader: { load, retry: vi.fn() },
    });
    expect(load).toHaveBeenCalledTimes(1);

    internalLoaderStatus.set('error');
    fixture.detectChanges();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('hides return to the last service point whenever the shared floor is not loaded', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(screen.getByLabelText('M2 mesa, Libre'));
    fixture.detectChanges();
    expect(screen.getByRole('button', { name: /Volver a/ })).toBeTruthy();

    const lastServicePoint = store.servicePoints().find((servicePoint) => servicePoint.table.id === 'table-1')!;
    store.beginFloorLoad();
    store.hydrateServicePoint({ table: lastServicePoint.table, floorElement: lastServicePoint.element });
    fixture.detectChanges();

    expect(store.floorLoadStatus()).toBe('loading');
    expect(screen.getByTestId('floor-loading-state')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Volver a/ })).toBeNull();
  });

  it('closes service-point search and ignores stale search actions when the shared floor starts loading', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const staleServicePoint = store.servicePoints().find((servicePoint) => servicePoint.table.id === 'table-1')!;
    const component = fixture.componentInstance as unknown as {
      servicePointSearchOpen(): boolean;
      servicePointSearchQuery(): string;
      submitServicePointSearch(query: string): void;
      selectServicePoint(element: typeof staleServicePoint.element): void;
    };

    fireEvent.click(screen.getByRole('button', { name: /Buscar mesa\/taburete/i }));
    expect(screen.getByRole('dialog', { name: /Buscar mesa\/taburete/i })).toBeTruthy();

    store.beginFloorLoad();
    store.hydrateServicePoint({ table: staleServicePoint.table, floorElement: staleServicePoint.element });
    fixture.detectChanges();

    expect(component.servicePointSearchOpen()).toBe(false);
    expect(screen.queryByRole('dialog', { name: /Buscar mesa\/taburete/i })).toBeNull();

    component.submitServicePointSearch('M1');
    component.selectServicePoint(staleServicePoint.element);
    fixture.detectChanges();

    expect(component.servicePointSearchQuery()).toBe('');
    expect(store.selectedTableId()).toBeNull();
  });

  it('opens the selected table panel from the floor plan', async () => {
    await renderServicePage();

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));

    expect(screen.getByRole('heading', { name: 'Mesa 1' })).toBeTruthy();
    expect(screen.getByText('Sin iniciar')).toBeTruthy();
    expect(screen.getByText('Todavía no hay productos añadidos.')).toBeTruthy();
  });

  it('uses the visible floor label for the selected table title when the backend table number is stale', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.hydrateServiceFloor({
      floorId: 'floor-main',
      floorName: 'Sala principal',
      rows: 4,
      columns: 4,
      floorElements: [
        {
          id: 'element-m12',
          type: 'table',
          label: 'M12',
          x: 1,
          y: 1,
          width: 2,
          height: 2,
          tableId: 'table-1',
        },
      ],
      restaurantTables: [
        {
          id: 'table-1',
          number: 37,
          capacity: 4,
          status: 'occupied',
          total: 23.5,
          openDuration: '1h 32m',
        },
      ],
    });
    fixture.detectChanges();

    fireEvent.click(screen.getByLabelText('M12 mesa, Ocupada'));
    fixture.detectChanges();

    expect(store.selectedTableId()).toBe('table-1');
    expect(screen.getByRole('heading', { name: 'Mesa 12' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Mesa 37' })).toBeNull();
  });

  it('loads the service floor on init and fetches the selected service point from the backend', async () => {
    const apiMock = createRestaurantPosApiMock();

    await renderServicePage(undefined, apiMock);
    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));

    expect(apiMock.listRestaurants).toHaveBeenCalledTimes(1);
    expect(apiMock.getRestaurantServiceFloor).toHaveBeenCalledWith('restaurant-mesaflow-centro');
    expect(apiMock.getRestaurantServicePoint).toHaveBeenCalledWith('restaurant-mesaflow-centro', 'table-1');
    expect(apiMock.getRestaurantServicePointOrder).toHaveBeenCalledWith('restaurant-mesaflow-centro', 'table-1');
  });

  it('occupies the selected table through the backend endpoint', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(screen.getByRole('button', { name: /Iniciar servicio/i }));
    fixture.detectChanges();

    expect(apiMock.occupyRestaurantServicePoint).toHaveBeenCalledWith('restaurant-mesaflow-centro', 'table-1');
    expect(store.selectedTable()).toEqual(expect.objectContaining({ id: 'table-1', status: 'occupied' }));
  });

  it('sends the selected table order to kitchen through the backend endpoint', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();

    expect(apiMock.sendRestaurantServicePointToKitchen).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'table-1',
      { lineIds: expect.arrayContaining([expect.any(String)]) },
    );
    expect(store.selectedTable()).toEqual(expect.objectContaining({ id: 'table-1', status: 'waiting_kitchen' }));
  });

  it('sends only visible pending line ids to kitchen so stale hidden lines stay out', async () => {
    const apiMock = createRestaurantPosApiMock();
    apiMock.__setServiceOrder('table-1', createServiceOrderRecord([
      {
        id: 'line-visible-burger',
        productName: 'Hamburguesa craft',
        productType: 'simple',
        preparationRoute: 'kitchen',
        quantity: 1,
        unitPriceCents: 1250,
        subtotalCents: 1250,
        status: 'pending',
        course: 'mains',
        kitchenNote: null,
        updatedAt: '2026-07-17T10:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
      {
        id: 'line-hidden-coca-cola',
        productName: 'Coca-Cola',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 1,
        unitPriceCents: 320,
        subtotalCents: 320,
        status: 'pending',
        course: 'drinks',
        kitchenNote: null,
        updatedAt: '2026-07-16T10:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ]));
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText(/M1 mesa/i));
    store.hydrateServicePointOrder('table-1', mapServicePointOrder({
      ...createServiceOrderRecord([
        {
          id: 'line-visible-burger',
          productName: 'Hamburguesa craft',
          productType: 'simple',
          preparationRoute: 'kitchen',
          quantity: 1,
          unitPriceCents: 1250,
          subtotalCents: 1250,
          status: 'pending',
          course: 'mains',
          kitchenNote: null,
          updatedAt: '2026-07-17T10:00:00.000Z',
          modifiers: [],
          comboSlots: [],
        },
      ]),
    }));
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();

    expect(apiMock.sendRestaurantServicePointToKitchen).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'table-1',
      { lineIds: ['line-visible-burger'] },
    );
  });

  it('marks the selected table as served through the backend endpoint', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar servido' }));
    fixture.detectChanges();

    expect(apiMock.markRestaurantServicePointServed).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'table-1',
      { lineIds: ['line-table-1-burger'] },
    );
    expect(store.selectedTable()).toEqual(expect.objectContaining({ id: 'table-1', status: 'served' }));
  });

  it('shows a busy send-to-kitchen action and ignores duplicate clicks while the request is pending', async () => {
    const apiMock = createRestaurantPosApiMock();
    const deferredKitchen$ = new Subject<ServicePointDetailDto>();
    vi.mocked(apiMock.sendRestaurantServicePointToKitchen).mockReturnValue(deferredKitchen$);
    const { fixture } = await renderServicePage(undefined, apiMock);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    const sendButton = screen.getByRole('button', { name: /Enviar el pedido de la mesa seleccionada a cocina/i });
    fireEvent.click(sendButton);
    fixture.detectChanges();
    fireEvent.click(sendButton);
    fixture.detectChanges();

    expect(apiMock.sendRestaurantServicePointToKitchen).toHaveBeenCalledTimes(1);
    expect(sendButton.getAttribute('aria-busy')).toBe('true');
    expect(sendButton.hasAttribute('disabled')).toBe(true);

    deferredKitchen$.next({
      table: {
        id: 'table-1',
        tableNumber: 1,
        name: null,
        capacity: 4,
        status: 'waiting_kitchen',
        occupiedAt: '2026-06-22T10:15:00.000Z',
        serviceStartedAt: '2026-06-22T10:15:00.000Z',
      },
      floorElement: null,
      serviceInfo: {
        guestCount: 4,
        lineCount: 1,
        totalCents: 1250,
        currency: 'EUR',
        servicePhase: {
          course: 'mains',
          status: 'pending',
        },
        durationMinutes: 0,
      },
    });
    deferredKitchen$.complete();
    fixture.detectChanges();

  });

  it('shows a busy served action and ignores duplicate clicks while the request is pending', async () => {
    const apiMock = createRestaurantPosApiMock();
    apiMock.__setServiceOrder('table-1', createServiceOrderRecord([
      {
        id: 'line-burger-ready',
        productName: 'Hamburguesa craft',
        productType: 'simple',
        preparationRoute: 'kitchen',
        quantity: 1,
        unitPriceCents: 1250,
        subtotalCents: 1250,
        status: 'ready',
        course: 'mains',
        kitchenNote: null,
        updatedAt: '2026-07-17T10:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ], 'sent_to_kitchen'));
    const deferredServed$ = new Subject<ServicePointDetailDto>();
    vi.mocked(apiMock.markRestaurantServicePointServed).mockReturnValue(deferredServed$);
    const { fixture } = await renderServicePage(undefined, apiMock);

    fireEvent.click(screen.getByLabelText(/M1 mesa/i));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todo' }));
    const servedButton = screen.getByRole('button', { name: /Confirmar servido/i });
    fireEvent.click(servedButton);
    fixture.detectChanges();
    fireEvent.click(servedButton);
    fixture.detectChanges();

    expect(apiMock.markRestaurantServicePointServed).toHaveBeenCalledTimes(1);
    expect(servedButton.getAttribute('aria-busy')).toBe('true');
    expect(servedButton.hasAttribute('disabled')).toBe(true);

    deferredServed$.complete();
  });

  it('opens served selection mode and confirms only selected lines', async () => {
    const apiMock = createRestaurantPosApiMock();
    apiMock.__setServiceOrder('table-1', createServiceOrderRecord([
      {
        id: 'line-burger',
        productName: 'Hamburguesa craft',
        productType: 'simple',
        preparationRoute: 'kitchen',
        quantity: 1,
        unitPriceCents: 1250,
        subtotalCents: 1250,
        status: 'ready',
        course: 'mains',
        kitchenNote: null,
        updatedAt: '2026-07-17T10:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
      {
        id: 'line-pasta',
        productName: 'Pasta fresca',
        productType: 'simple',
        preparationRoute: 'kitchen',
        quantity: 1,
        unitPriceCents: 1450,
        subtotalCents: 1450,
        status: 'preparing',
        course: 'mains',
        kitchenNote: null,
        updatedAt: '2026-07-17T10:01:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ], 'sent_to_kitchen'));
    const { fixture } = await renderServicePage(undefined, apiMock);

    fireEvent.click(screen.getByLabelText(/M1 mesa/i));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('checkbox', { name: /Hamburguesa craft/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar servido/i }));
    fixture.detectChanges();

    expect(apiMock.markRestaurantServicePointServed).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'table-1',
      { lineIds: ['line-burger'] },
    );
  });

  it('cancels served selection through the panel and clears selected lines', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('checkbox', { name: /Hamburguesa craft/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fixture.detectChanges();

    expect(screen.queryByRole('button', { name: /Confirmar servido/i })).toBeNull();
    expect(apiMock.markRestaurantServicePointServed).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
    fixture.detectChanges();

    expect((screen.getByRole('checkbox', { name: /Hamburguesa craft/i }) as HTMLInputElement).checked).toBe(false);
  });

  it('clears served selection before it can be confirmed for a different table', async () => {
    const apiMock = createRestaurantPosApiMock();
    apiMock.__setServiceOrder('table-1', createServiceOrderRecord([
      {
        id: 'line-burger',
        productName: 'Hamburguesa craft',
        productType: 'simple',
        preparationRoute: 'kitchen',
        quantity: 1,
        unitPriceCents: 1250,
        subtotalCents: 1250,
        status: 'ready',
        course: 'mains',
        kitchenNote: null,
        updatedAt: '2026-07-17T10:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ], 'sent_to_kitchen'));
    const { fixture } = await renderServicePage(undefined, apiMock);

    fireEvent.click(screen.getByLabelText(/M1 mesa/i));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('checkbox', { name: /Hamburguesa craft/i }));
    fireEvent.click(screen.getByLabelText('M2 mesa, Libre'));
    fixture.detectChanges();

    expect(screen.queryByRole('button', { name: /Confirmar servido/i })).toBeNull();
    expect(apiMock.markRestaurantServicePointServed).not.toHaveBeenCalled();
  });

  it('shows a loading state only on the charge button while charging', async () => {
    const apiMock = createRestaurantPosApiMock();
    const deferredCharge$ = new Subject<ServicePointDetailDto>();
    const { fixture } = await renderServicePage(undefined, apiMock);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar servido' }));
    fixture.detectChanges();
    vi.mocked(apiMock.chargeRestaurantServicePoint).mockReturnValue(deferredCharge$);

    fireEvent.click(screen.getByRole('button', { name: /Efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    expect(screen.getByRole('button', { name: /Cobrar/i }).getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('button', { name: /Efectivo/i }).getAttribute('aria-busy')).not.toBe('true');
  });

  it('charges the selected table through the backend endpoint', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar servido' }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    expect(apiMock.chargeRestaurantServicePoint).toHaveBeenCalledWith('restaurant-mesaflow-centro', 'table-1');
    expect(apiMock.registerRestaurantOrderPayment).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'order:table-1',
      1250,
      'cash',
    );
    expect(store.selectedOrder()).toEqual(expect.objectContaining({ paymentMethod: 'cash', status: 'paid' }));
    expect(store.selectedTable()).toEqual(expect.objectContaining({ id: 'table-1', status: 'paid' }));
  });

  it('opens a selected stool as a one-person service panel', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('Stool 1 mesa, Libre'));

    expect(store.selectedTableId()).toBe('stool-1');
    expect(screen.getByRole('heading', { name: 'T1' })).toBeTruthy();
    expect(screen.getByText('1 pax')).toBeTruthy();
  });

  it('filters products in a modal and adds the selected result to the current order', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fireEvent.input(within(getProductDialog()).getByRole('searchbox', { name: /Buscar producto/i }), {
      target: { value: 'limonada' },
    });
    fixture.detectChanges();
    fireEvent.click(within(getProductDialog()).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines[0]).toEqual(expect.objectContaining({ productName: 'Limonada con gas' }));
    expect(screen.getByText('1 x Limonada con gas')).toBeTruthy();
    expect(getProductDialog()).toBeTruthy();
    expect(within(getProductDialog()).getByText('Añadido')).toBeTruthy();
    expect(within(getProductDialog()).getByLabelText('Cantidad de Limonada con gas: 1')).toBeTruthy();
  });

  it('updates product quantities live from the search modal and closes it with finish', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = getProductDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fixture.detectChanges();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines.find((line) => line.productName === 'Limonada con gas')).toEqual(expect.objectContaining({ quantity: 2 }));
    expect(screen.getByText('2 x Limonada con gas')).toBeTruthy();
    expect(within(dialog).getByLabelText('Cantidad de Limonada con gas: 2')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar una unidad de Limonada con gas' }));
    fixture.detectChanges();
    expect(store.selectedOrder()?.lines.find((line) => line.productName === 'Limonada con gas')).toEqual(expect.objectContaining({ quantity: 1 }));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar una unidad de Limonada con gas' }));
    fixture.detectChanges();
    expect(store.selectedOrder()?.lines.find((line) => line.productName === 'Limonada con gas')).toBeUndefined();
    expect(within(dialog).queryByRole('button', { name: 'Quitar una unidad de Limonada con gas' })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    fixture.detectChanges();

    expect(queryProductDialog()).toBeNull();
  });

  it('keeps direct-product quantity controls visible after backend reloads the same line', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const record = createServiceOrderRecord([
      {
        id: 'line-lemonade',
        restaurantProductId: 'product-3',
        productId: 'catalog-product-3',
        productName: 'Limonada con gas',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 1,
        unitPriceCents: 450,
        subtotalCents: 450,
        status: 'pending',
        course: 'drinks',
        kitchenNote: null,
        updatedAt: '2026-06-22T10:01:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ]);

    apiMock.__setServiceOrder('table-1', record);
    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    store.hydrateServicePointOrder('table-1', mapServicePointOrder(record));
    fixture.detectChanges();

    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = getProductDialog();
    expect(within(dialog).getByLabelText('Cantidad de Limonada con gas: 1')).toBeTruthy();
    // El stepper inline sigue disponible tras la recarga del backend; su "+" comparte
    // etiqueta con la acción de añadir, así que se comprueba el "−" como señal inequívoca.
    expect(within(dialog).getByRole('button', { name: 'Quitar una unidad de Limonada con gas' })).toBeTruthy();
  });

  it('routes remote direct-line controls through the desired-quantity queue using the concrete line id', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const orderWrite = fixture.debugElement.injector.get(OrderWriteService);
    const increaseDirect = vi.spyOn(orderWrite, 'increaseDirectProductQuantity').mockImplementation(() => undefined);
    const decreaseDirect = vi.spyOn(orderWrite, 'decreaseDirectProductQuantity').mockImplementation(() => undefined);
    const record = createServiceOrderRecord([
      {
        id: 'line-lemonade',
        restaurantProductId: 'product-3',
        productId: 'catalog-product-3',
        productName: 'Limonada con gas',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 2,
        unitPriceCents: 450,
        subtotalCents: 900,
        status: 'pending',
        course: 'drinks',
        kitchenNote: null,
        updatedAt: '2026-07-17T13:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ]);

    store.hydrateProducts(
      store.products().map((product) =>
        product.id === 'product-3' ? { ...product, restaurantProductId: 'product-3' } : product,
      ),
    );
    apiMock.__setServiceOrder('table-1', record);
    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    store.hydrateServicePointOrder('table-1', mapServicePointOrder(record));
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar una unidad de Limonada con gas' }));

    expect(increaseDirect).toHaveBeenCalledWith('product-3', 'line-lemonade');
    expect(decreaseDirect).toHaveBeenCalledWith('product-3', 'line-lemonade');
    expect(apiMock.updateRestaurantOrderLine).not.toHaveBeenCalled();
    expect(apiMock.deleteRestaurantOrderLine).not.toHaveBeenCalled();
  });

  it('preserves a remote direct line signature and historical price from the inline search stepper', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const record = createServiceOrderRecord([
      {
        id: 'line-lemonade-historical-price',
        restaurantProductId: 'product-3',
        productId: 'catalog-product-3',
        productName: 'Limonada con gas',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 1,
        unitPriceCents: 350,
        subtotalCents: 350,
        configurationSignature: 'product-3|historical-price',
        status: 'pending',
        course: 'drinks',
        kitchenNote: null,
        updatedAt: '2026-07-17T13:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ]);

    store.hydrateProducts(
      store.products().map((product) =>
        product.id === 'product-3' ? { ...product, restaurantProductId: 'product-3' } : product,
      ),
    );
    apiMock.__setServiceOrder('table-1', record);
    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    store.hydrateServicePointOrder('table-1', mapServicePointOrder(record));
    fixture.detectChanges();

    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();
    fireEvent.click(within(getProductDialog()).getByRole('button', { name: /adir una unidad de Limonada con gas$/i }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines.find((line) => line.id === 'line-lemonade-historical-price')).toEqual(
      expect.objectContaining({
        quantity: 2,
        unitPrice: 3.5,
        subtotal: 7,
        configurationSignature: 'product-3|historical-price',
      }),
    );
  });

  it('keeps annotated direct-line controls on the generic line queue', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const orderWrite = fixture.debugElement.injector.get(OrderWriteService);
    const increaseDirect = vi.spyOn(orderWrite, 'increaseDirectProductQuantity').mockImplementation(() => undefined);
    const decreaseDirect = vi.spyOn(orderWrite, 'decreaseDirectProductQuantity').mockImplementation(() => undefined);
    const removeDirect = vi.spyOn(orderWrite, 'removeDirectProduct').mockImplementation(() => undefined);
    const record = createServiceOrderRecord([
      {
        id: 'line-lemonade-noted',
        restaurantProductId: 'product-3',
        productId: 'catalog-product-3',
        productName: 'Limonada con gas',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 2,
        unitPriceCents: 450,
        subtotalCents: 900,
        status: 'pending',
        course: 'drinks',
        kitchenNote: 'Sin hielo',
        updatedAt: '2026-07-17T13:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
      {
        id: 'line-lemonade-clean',
        restaurantProductId: 'product-3',
        productId: 'catalog-product-3',
        productName: 'Limonada con gas',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 1,
        unitPriceCents: 450,
        subtotalCents: 450,
        status: 'pending',
        course: 'drinks',
        kitchenNote: null,
        updatedAt: '2026-07-17T13:00:01.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ]);

    store.hydrateProducts(
      store.products().map((product) =>
        product.id === 'product-3' ? { ...product, restaurantProductId: 'product-3' } : product,
      ),
    );
    apiMock.__setServiceOrder('table-1', record);
    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    store.hydrateServicePointOrder('table-1', mapServicePointOrder(record));
    fixture.detectChanges();

    const notedRow = () => screen.getByText(/Sin hielo/).closest<HTMLElement>('.theme-order-line')!;
    fireEvent.click(within(notedRow()).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fixture.detectChanges();
    fireEvent.click(within(notedRow()).getByRole('button', { name: 'Quitar una unidad de Limonada con gas' }));
    fixture.detectChanges();
    fireEvent.click(within(notedRow()).getByRole('button', { name: 'Eliminar Limonada con gas del pedido' }));
    fixture.detectChanges();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminar todas las unidades' })).getByRole('button', { name: 'Sí, eliminar todas las unidades' }));
    fixture.detectChanges();

    expect(increaseDirect).not.toHaveBeenCalled();
    expect(decreaseDirect).not.toHaveBeenCalled();
    expect(removeDirect).not.toHaveBeenCalled();
    expect(vi.mocked(apiMock.updateRestaurantOrderLine).mock.calls).toEqual([
      ['restaurant-mesaflow-centro', 'order:table-1', 'line-lemonade-noted', { quantity: 3 }],
      ['restaurant-mesaflow-centro', 'order:table-1', 'line-lemonade-noted', { quantity: 2 }],
    ]);
    expect(apiMock.deleteRestaurantOrderLine).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'order:table-1',
      'line-lemonade-noted',
    );
  });

  it('shows Add for a direct product whose only order line is annotated and creates a new clean line', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const orderWrite = fixture.debugElement.injector.get(OrderWriteService);
    vi.spyOn(orderWrite, 'addProduct').mockImplementation((productId) => store.addProductToSelectedTable(productId));
    const record = createServiceOrderRecord([
      {
        id: 'line-lemonade-noted',
        restaurantProductId: 'product-3',
        productId: 'catalog-product-3',
        productName: 'Limonada con gas',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 1,
        unitPriceCents: 450,
        subtotalCents: 450,
        status: 'pending',
        course: 'drinks',
        kitchenNote: 'Sin hielo',
        updatedAt: '2026-07-17T13:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ]);

    store.hydrateProducts(
      store.products().map((product) =>
        product.id === 'product-3' ? { ...product, restaurantProductId: 'product-3' } : product,
      ),
    );
    apiMock.__setServiceOrder('table-1', record);
    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    store.hydrateServicePointOrder('table-1', mapServicePointOrder(record));
    fixture.detectChanges();
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = getProductDialog();
    expect(within(dialog).queryByLabelText('Cantidad de Limonada con gas: 1')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fixture.detectChanges();

    const lemonadeLines = store.selectedOrder()?.lines.filter((line) => line.productId === 'product-3') ?? [];
    expect(lemonadeLines.find((line) => line.id === 'line-lemonade-noted')).toEqual(
      expect.objectContaining({ quantity: 1, kitchenNote: 'Sin hielo' }),
    );
    const cleanLine = lemonadeLines.find((line) => line.id !== 'line-lemonade-noted');
    expect(cleanLine).toEqual(expect.objectContaining({ quantity: 1, status: 'pending' }));
    expect(cleanLine?.kitchenNote).toBeUndefined();
    expect(cleanLine?.note).toBeUndefined();
  });

  it('routes local unconfirmed direct-line controls through the desired-quantity queue', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const orderWrite = fixture.debugElement.injector.get(OrderWriteService);
    const increaseDirect = vi.spyOn(orderWrite, 'increaseDirectProductQuantity').mockImplementation(() => undefined);
    const decreaseDirect = vi.spyOn(orderWrite, 'decreaseDirectProductQuantity').mockImplementation(() => undefined);
    const removeDirect = vi.spyOn(orderWrite, 'removeDirectProduct').mockImplementation(() => undefined);
    const record = createServiceOrderRecord([
      {
        id: 'line-local-lemonade',
        restaurantProductId: 'product-3',
        productId: 'catalog-product-3',
        productName: 'Limonada con gas',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 2,
        unitPriceCents: 450,
        subtotalCents: 900,
        status: 'pending',
        course: 'drinks',
        kitchenNote: null,
        updatedAt: '2026-07-17T13:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ]);
    const localOrder = mapServicePointOrder(record)!;
    localOrder.lines[0] = { ...localOrder.lines[0], remote: false };

    store.hydrateProducts(
      store.products().map((product) =>
        product.id === 'product-3' ? { ...product, restaurantProductId: 'product-3' } : product,
      ),
    );
    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    store.hydrateServicePointOrder('table-1', localOrder);
    fixture.detectChanges();

    const localLineRow = screen.getByText('2 x Limonada con gas').closest<HTMLElement>('.theme-order-line')!;
    fireEvent.click(within(localLineRow).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fireEvent.click(within(localLineRow).getByRole('button', { name: 'Quitar una unidad de Limonada con gas' }));
    fireEvent.click(within(localLineRow).getByRole('button', { name: 'Eliminar Limonada con gas del pedido' }));
    fixture.detectChanges();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminar todas las unidades' })).getByRole('button', { name: 'Sí, eliminar todas las unidades' }));
    fixture.detectChanges();

    expect(increaseDirect).toHaveBeenCalledWith('product-3', 'line-local-lemonade');
    expect(decreaseDirect).toHaveBeenCalledWith('product-3', 'line-local-lemonade');
    expect(removeDirect).toHaveBeenCalledWith('product-3', 'line-local-lemonade');
    expect(apiMock.updateRestaurantOrderLine).not.toHaveBeenCalled();
    expect(apiMock.deleteRestaurantOrderLine).not.toHaveBeenCalled();
  });

  it('opens the customizer for configurable products and adds the selected snapshot', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const searchDialog = getProductDialog();
    fireEvent.click(within(searchDialog).getByRole('button', { name: 'Configurar Hamburguesa craft' }));
    fixture.detectChanges();

    const customizer = screen.getByRole('dialog', { name: /Hamburguesa craft/i });
    fireEvent.click(within(customizer).getByLabelText(/Bacon/i));
    fireEvent.input(within(customizer).getByRole('textbox'), { target: { value: 'Sin prisa' } });
    fireEvent.click(within(customizer).getByRole('button', { name: /Añadir por/i }));
    fixture.detectChanges();

    const line = store.selectedOrder()?.lines.find((currentLine) => currentLine.productName === 'Hamburguesa craft');
    expect(line).toEqual(
      expect.objectContaining({
        productId: 'product-1',
        quantity: 1,
        kitchenNote: 'Sin prisa',
        unitPrice: 14,
      }),
    );
    expect(line?.selectedModifiers.map((modifier) => modifier.optionId)).toContain('extra-bacon');
    const tablePanel = screen.getByLabelText('Panel de mesa seleccionada');
    expect(within(tablePanel).getByText(/Bacon/)).toBeTruthy();
    expect(within(tablePanel).getByText(/Nota: Sin prisa/)).toBeTruthy();
  });

  it('opens the product customizer for platter products with modifiers', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const searchDialog = getProductDialog();
    fireEvent.input(within(searchDialog).getByRole('searchbox', { name: /Buscar producto/i }), {
      target: { value: 'lomo' },
    });
    fixture.detectChanges();

    expect(within(searchDialog).getByText('Plato combinado')).toBeTruthy();
    fireEvent.click(within(searchDialog).getByRole('button', { name: 'Configurar plato Plato combinado de lomo' }));
    fixture.detectChanges();

    const customizer = screen.getByRole('dialog', { name: /Plato combinado de lomo/i });
    fireEvent.click(within(customizer).getByLabelText(/Huevo extra/i));
    fireEvent.click(within(customizer).getByRole('button', { name: /A.adir por/i }));
    fixture.detectChanges();

    const line = store.selectedOrder()?.lines.find((currentLine) => currentLine.productName === 'Plato combinado de lomo');
    expect(line).toEqual(
      expect.objectContaining({
        productId: 'product-17',
        unitPrice: 14.1,
        platterComponents: [
          expect.objectContaining({ name: 'Lomo' }),
          expect.objectContaining({ name: 'Huevo' }),
          expect.objectContaining({ name: 'Patatas fritas' }),
          expect.objectContaining({ name: 'Ensalada' }),
        ],
      }),
    );
    expect(line?.selectedModifiers.map((modifier) => modifier.optionId)).toContain('platter-extra-egg');
    const tablePanel = screen.getByLabelText('Panel de mesa seleccionada');
    expect(within(tablePanel).getByText(/Incluye:/)).toBeTruthy();
    expect(within(tablePanel).getByText(/lomo, huevo, patatas fritas, ensalada/)).toBeTruthy();

    fireEvent.click(within(searchDialog).getByRole('button', { name: /Añadir una unidad de Plato combinado de lomo con Huevo extra/ }));
    fixture.detectChanges();

    expect(screen.queryByRole('dialog', { name: /Plato combinado de lomo/i })).toBeNull();
    expect(store.selectedOrder()?.lines.find((currentLine) => currentLine.productName === 'Plato combinado de lomo')).toEqual(
      expect.objectContaining({ quantity: 2 }),
    );
    expect(within(searchDialog).getByLabelText(/Cantidad de Plato combinado de lomo .*: 2/)).toBeTruthy();
  });

  it('adds platter products without modifiers directly from product search', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const searchDialog = getProductDialog();
    fireEvent.input(within(searchDialog).getByRole('searchbox', { name: /Buscar producto/i }), {
      target: { value: 'vegetal' },
    });
    fixture.detectChanges();

    const addButton = within(searchDialog).getByRole('button', { name: /A.adir una unidad de Plato combinado vegetal/ });
    expect(addButton.textContent?.trim()).toMatch(/A.adir/);
    fireEvent.click(addButton);
    fixture.detectChanges();

    expect(screen.queryByRole('dialog', { name: /Plato combinado vegetal/i })).toBeNull();
    expect(store.selectedOrder()?.lines.find((currentLine) => currentLine.productId === 'product-19')).toEqual(
      expect.objectContaining({
        productName: 'Plato combinado vegetal',
        platterComponents: expect.arrayContaining([expect.objectContaining({ name: 'Ensalada' })]),
      }),
    );
    expect(screen.getByText('1 x Plato combinado vegetal')).toBeTruthy();
  });

  it('opens combo customizer from product search and adds the configured menu', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = getProductDialog();
    const comboAdd = within(dialog).getByRole('button', { name: 'Configurar menú Menu Classic Burger' });

    expect(within(dialog).getByText('Menu Classic Burger')).toBeTruthy();
    expect(within(dialog).getByText('Menú')).toBeTruthy();
    expect(comboAdd.hasAttribute('disabled')).toBe(false);

    fireEvent.click(comboAdd);
    fixture.detectChanges();

    const comboDialog = screen.getByRole('dialog', { name: 'Menu Classic Burger' });
    expect((within(comboDialog).getByRole('radio', { name: /Hamburguesa clásica/i }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(comboDialog).getByRole('button', { name: 'Añadir menú' }));
    fixture.detectChanges();

    const line = store.selectedOrder()?.lines.find((currentLine) => currentLine.productId === 'product-16');
    expect(line).toEqual(
      expect.objectContaining({
        productName: 'Menu Classic Burger',
        unitPrice: 13.5,
        selectedComboSlots: expect.arrayContaining([
          expect.objectContaining({ slotName: 'Hamburguesa' }),
          expect.objectContaining({ slotName: 'Acompanamiento' }),
          expect.objectContaining({ slotName: 'Bebida' }),
        ]),
      }),
    );
    const tablePanel = screen.getByLabelText('Panel de mesa seleccionada');
    expect(within(tablePanel).getByText('1 x Menu Classic Burger')).toBeTruthy();
    expect(within(tablePanel).getByText(/Hamburguesa clásica/)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: /Añadir una unidad de Menu Classic Burger con/i }));
    fixture.detectChanges();

    expect(screen.queryByRole('dialog', { name: 'Menu Classic Burger' })).toBeNull();
    expect(store.selectedOrder()?.lines.find((currentLine) => currentLine.productId === 'product-16')).toEqual(expect.objectContaining({ quantity: 2 }));
    expect(within(dialog).getByLabelText(/Cantidad de Menu Classic Burger .*: 2/i)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear otra opción de Menu Classic Burger' }));
    fixture.detectChanges();

    const secondComboDialog = screen.getByRole('dialog', { name: 'Menu Classic Burger' });
    fireEvent.click(within(secondComboDialog).getByRole('radio', { name: /Agua/i }));
    fireEvent.click(within(secondComboDialog).getByRole('button', { name: 'Añadir menú' }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines.filter((currentLine) => currentLine.productId === 'product-16')).toHaveLength(2);
    expect(within(dialog).getByText('3 en pedido · 2 opciones')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ver opciones' }));
    fixture.detectChanges();
    expect(within(dialog).getByText(/2 x .*Coca-Cola/)).toBeTruthy();
    expect(within(dialog).getByText(/1 x .*Agua/)).toBeTruthy();
  });

  it('filters the product search by favorites and lets favorites be updated from the dialog', async () => {
    const { fixture } = await renderServicePage();

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = getProductDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Favoritos' }));
    fixture.detectChanges();

    expect(within(dialog).getByText('Hamburguesa craft')).toBeTruthy();
    expect(within(dialog).getByText('Limonada con gas')).toBeTruthy();
    expect(within(dialog).queryByText('Croquetas de jamón ibérico')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar Hamburguesa craft de favoritos' }));
    fixture.detectChanges();

    expect(within(dialog).queryByText('Hamburguesa craft')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Todos' }));
    fixture.detectChanges();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir Croquetas de jamón ibérico a favoritos' }));
    fixture.detectChanges();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Favoritos' }));
    fixture.detectChanges();

    expect(within(dialog).getByText('Croquetas de jamón ibérico')).toBeTruthy();
  });

  it('loads and persists favorite products in local storage', async () => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem('locale', 'es');
    storage.setItem('restaurant-pos.favorite-products', JSON.stringify(['product-2']));
    const { fixture } = await renderServicePage(storage);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = getProductDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Favoritos' }));
    fixture.detectChanges();

    expect(within(dialog).getByText('Croquetas de jamón ibérico')).toBeTruthy();
    expect(within(dialog).queryByText('Hamburguesa craft')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Todos' }));
    fixture.detectChanges();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir Hamburguesa craft a favoritos' }));
    fixture.detectChanges();

    expect(storage.getItem('restaurant-pos.favorite-products')).toBe(JSON.stringify(['product-2', 'product-1']));
  });

  it('filters the product search by service section chip', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = getProductDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bebidas' }));
    fixture.detectChanges();

    expect(within(dialog).getByRole('button', { name: 'Todos' }).textContent).toContain(String(store.products().filter((product) => product.available).length));
    expect(within(dialog).getByText('Limonada con gas')).toBeTruthy();
    expect(within(dialog).getByText('Café solo')).toBeTruthy();
    expect(within(dialog).queryByText('Hamburguesa craft')).toBeNull();
    expect(within(dialog).queryByText('Ensalada César')).toBeNull();
  });

  it('adds products and advances the selected table through kitchen, served, and payment states', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);

    expect(screen.getByText('1 x Hamburguesa craft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir una unidad de Hamburguesa craft' }));
    fixture.detectChanges();
    expect(screen.getByText('2 x Hamburguesa craft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar una unidad de Hamburguesa craft' }));
    fixture.detectChanges();
    expect(screen.getByText('1 x Hamburguesa craft')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Principal' })).toBeTruthy();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(store.selectedTable()?.status).toBe('occupied');

    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('waiting_kitchen');
    expect(screen.getAllByText('En cocina').length).toBeGreaterThan(0);

    expect(screen.queryByRole('region', { name: 'Preparación' })).toBeNull();
    fireEvent.input(screen.getByRole('textbox', { name: 'Nota para Hamburguesa craft' }), { target: { value: 'Sin cebolla' } });
    fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar servido' }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines[0]).toEqual(expect.objectContaining({ note: 'Sin cebolla', status: 'served' }));
    expect(store.selectedTable()?.status).toBe('served');
    expect(screen.getAllByText('Servido').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.paymentMethod).toBe('cash');
    expect(store.selectedOrder()?.status).toBe('paid');
    expect(store.selectedTable()?.status).toBe('paid');
  });

  it('removes a product line from the selected order', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const record = createServiceOrderRecord([
      {
        id: 'line-burger',
        productName: 'Hamburguesa craft',
        productType: 'simple',
        preparationRoute: 'kitchen',
        quantity: 1,
        unitPriceCents: 1250,
        subtotalCents: 1250,
        status: 'pending',
        course: 'mains',
        kitchenNote: null,
        updatedAt: '2026-06-22T10:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
      {
        id: 'line-lemonade',
        productName: 'Limonada con gas',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 1,
        unitPriceCents: 450,
        subtotalCents: 450,
        status: 'pending',
        course: 'drinks',
        kitchenNote: null,
        updatedAt: '2026-06-22T10:01:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ]);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    apiMock.__setServiceOrder('table-1', record);
    store.hydrateServicePointOrder('table-1', mapServicePointOrder(record));
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Hamburguesa craft del pedido' }));
    fixture.detectChanges();

    expect(apiMock.deleteRestaurantOrderLine).toHaveBeenCalledTimes(1);
    expect(store.selectedOrder()?.lines.map((line) => line.productName)).toEqual(['Limonada con gas']);
    expect(screen.queryByText('1 x Hamburguesa craft')).toBeNull();
    expect(screen.getByText('1 x Limonada con gas')).toBeTruthy();
  });

  it('cancels a line already sent to the kitchen so it does not reappear after reload', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const record = createServiceOrderRecord([
      {
        id: 'line-burger',
        productName: 'Hamburguesa craft',
        productType: 'simple',
        preparationRoute: 'kitchen',
        quantity: 1,
        unitPriceCents: 1250,
        subtotalCents: 1250,
        status: 'sent_to_kitchen',
        course: 'mains',
        kitchenNote: null,
        updatedAt: '2026-06-22T10:05:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ], 'sent_to_kitchen');

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    apiMock.__setServiceOrder('table-1', record);
    store.hydrateServicePointOrder('table-1', mapServicePointOrder(record));
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Hamburguesa craft del pedido' }));
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: 'Cancelar producto de cocina' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, cancelar el producto' }));
    fixture.detectChanges();

    expect(apiMock.cancelRestaurantOrderLine).toHaveBeenCalledTimes(1);
    expect(apiMock.deleteRestaurantOrderLine).not.toHaveBeenCalled();
    expect(screen.queryByText('1 x Hamburguesa craft')).toBeNull();
    expect(store.selectedServiceInfo()?.courseGroups).toEqual([]);
  });

  it('marks kitchen lines older than 24 hours as served on refresh', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const record = createServiceOrderRecord([
      {
        id: 'line-burger',
        productName: 'Hamburguesa craft',
        productType: 'simple',
        preparationRoute: 'kitchen',
        quantity: 1,
        unitPriceCents: 1250,
        subtotalCents: 1250,
        status: 'sent_to_kitchen',
        course: 'mains',
        kitchenNote: null,
        updatedAt: '2026-07-14T09:00:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ], 'sent_to_kitchen');

    apiMock.__setServiceOrder('table-1', record);
    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fixture.detectChanges();

    expect(apiMock.updateRestaurantOrderLineStatus).toHaveBeenCalledTimes(1);
    expect(apiMock.updateRestaurantOrderLineStatus).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'order:table-1',
      'line-burger',
      'served',
    );
    expect(store.selectedOrder()?.lines[0]?.status).toBe('served');
    expect(store.selectedTable()?.status).toBe('served');
  });

  it('keeps a cancelled kitchen line hidden even if the immediate order reload is stale', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const record = createServiceOrderRecord([
      {
        id: 'line-burger',
        productName: 'Hamburguesa craft',
        productType: 'simple',
        preparationRoute: 'kitchen',
        quantity: 1,
        unitPriceCents: 1250,
        subtotalCents: 1250,
        status: 'sent_to_kitchen',
        course: 'mains',
        kitchenNote: null,
        updatedAt: '2026-06-22T10:05:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ], 'sent_to_kitchen');

    apiMock.__setServiceOrder('table-1', record);
    vi.mocked(apiMock.cancelRestaurantOrderLine).mockReturnValueOnce(
      of({
        order: {
          id: 'order:table-1',
          restaurantId: 'restaurant-mesaflow-centro',
          tableId: 'table-1',
          status: 'open',
          currency: 'EUR',
          guestCount: 4,
          subtotalCents: 1250,
          taxCents: 0,
          discountTotalCents: 0,
          totalCents: 1250,
          paidCents: 0,
          balanceCents: 1250,
          openedAt: '2026-06-22T10:00:00.000Z',
          updatedAt: '2026-06-22T10:09:00.000Z',
          closedAt: null,
        },
        lines: [],
        payments: [],
      }),
    );

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    store.hydrateServicePointOrder('table-1', mapServicePointOrder(record));
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Hamburguesa craft del pedido' }));
    fixture.detectChanges();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Cancelar producto de cocina' })).getByRole('button', { name: 'Sí, cancelar el producto' }));
    fixture.detectChanges();

    expect(screen.queryByText('1 x Hamburguesa craft')).toBeNull();
    expect(store.selectedServiceInfo()?.courseGroups).toEqual([]);
  });

  it('hides a line when the cancel response keeps served status but includes cancelledAt', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const record = createServiceOrderRecord([
      {
        id: 'line-beer',
        productName: 'Cerveza',
        productType: 'simple',
        preparationRoute: 'bar',
        quantity: 2,
        unitPriceCents: 350,
        subtotalCents: 700,
        status: 'served',
        course: 'drinks',
        kitchenNote: null,
        updatedAt: '2026-06-22T10:05:00.000Z',
        modifiers: [],
        comboSlots: [],
      },
    ], 'served');

    apiMock.__setServiceOrder('table-1', record);
    vi.mocked(apiMock.cancelRestaurantOrderLine).mockReturnValueOnce(
      of({
        order: {
          id: 'order:table-1',
          restaurantId: 'restaurant-mesaflow-centro',
          tableId: 'table-1',
          status: 'open',
          currency: 'EUR',
          guestCount: 4,
          subtotalCents: 700,
          taxCents: 0,
          discountTotalCents: 0,
          totalCents: 700,
          paidCents: 0,
          balanceCents: 700,
          openedAt: '2026-06-22T10:00:00.000Z',
          updatedAt: '2026-06-22T10:09:00.000Z',
          closedAt: null,
        },
        lines: [
          {
            id: 'line-beer',
            restaurantProductId: 'rp-beer',
            productId: 'product-beer',
            productName: 'Cerveza',
            productType: 'simple',
            course: 'drinks',
            preparationRoute: 'bar',
            basePriceCents: 350,
            unitPriceCents: 350,
            quantity: 2,
            subtotalCents: 700,
            taxRateName: null,
            taxRatePercent: null,
            taxCents: 0,
            status: 'served',
            kitchenNote: null,
            cancellationReason: 'removed_by_staff',
            cancelledAt: '2026-06-22T10:09:00.000Z',
            configurationSignature: 'beer::',
            modifiers: [],
            comboSlots: [],
            platterComponents: [],
          },
        ],
        payments: [],
      }),
    );

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    store.hydrateServicePointOrder('table-1', mapServicePointOrder(record));
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Cerveza del pedido' }));
    fixture.detectChanges();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Cancelar producto de cocina' })).getByRole('button', { name: 'Sí, cancelar el producto' }));
    fixture.detectChanges();

    expect(screen.queryByText('2 x Cerveza')).toBeNull();
    expect(store.selectedServiceInfo()?.courseGroups).toEqual([]);
  });

  it('opens a simulated card gateway and accepts or rejects payment without losing the order', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Tarjeta/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    expect(screen.getByRole('dialog', { name: /Pasarela bancaria/i })).toBeTruthy();
    expect(screen.getByText(/Conectando con terminal/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Error/i }));
    fixture.detectChanges();

    expect(screen.getByText(/Pago rechazado/i)).toBeTruthy();
    expect(store.selectedTable()?.status).toBe('waiting_kitchen');
    expect(store.selectedOrder()?.status).toBe('sent_to_kitchen');
    expect(store.selectedOrder()?.lines.length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: /Aceptar pago/i }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.paymentMethod).toBe('card');
    expect(store.selectedOrder()?.status).toBe('paid');
    expect(store.selectedTable()?.status).toBe('paid');
    expect(screen.queryByRole('dialog', { name: /Pasarela bancaria/i })).toBeNull();
  });

  it('asks for confirmation before charging when there are items pending to send to the kitchen', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: 'Enviar a cocina antes de cobrar' });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText(/se enviará directamente a cocina/i)).toBeTruthy();

    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancelar cobro' })[1]);
    fixture.detectChanges();

    expect(screen.queryByRole('dialog', { name: 'Enviar a cocina antes de cobrar' })).toBeNull();
    expect(store.selectedTable()?.status).toBe('occupied');
    expect(store.selectedOrder()?.status).toBe('open');
    expect(apiMock.sendRestaurantServicePointToKitchen).not.toHaveBeenCalled();
    expect(apiMock.chargeRestaurantServicePoint).not.toHaveBeenCalled();
  });

  it('sends pending items to the kitchen and then continues charging after confirmation', async () => {
    const apiMock = createRestaurantPosApiMock();
    const { fixture } = await renderServicePage(undefined, apiMock);
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: 'Enviar a cocina antes de cobrar' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar y continuar' }));
    fixture.detectChanges();

    expect(apiMock.sendRestaurantServicePointToKitchen).toHaveBeenCalledTimes(1);
    expect(apiMock.chargeRestaurantServicePoint).toHaveBeenCalledTimes(1);
    expect(store.selectedTable()?.status).toBe('paid');
    expect(screen.queryByRole('dialog', { name: 'Enviar a cocina antes de cobrar' })).toBeNull();
  });

  it('shows the charge spinner immediately after confirming send to kitchen before the charge request starts', async () => {
    const apiMock = createRestaurantPosApiMock();
    const deferredSendToKitchen$ = new Subject<ServicePointDetailDto>();
    vi.mocked(apiMock.sendRestaurantServicePointToKitchen).mockReturnValue(deferredSendToKitchen$);
    const { fixture } = await renderServicePage(undefined, apiMock);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: 'Enviar a cocina antes de cobrar' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar y continuar' }));
    fixture.detectChanges();

    expect(screen.getByRole('button', { name: /Cobrar/i }).getAttribute('aria-busy')).toBe('true');
    expect(apiMock.sendRestaurantServicePointToKitchen).toHaveBeenCalledTimes(1);
    expect(apiMock.chargeRestaurantServicePoint).not.toHaveBeenCalled();

    deferredSendToKitchen$.next({
      table: {
        id: 'table-1',
        tableNumber: 1,
        name: null,
        capacity: 4,
        status: 'waiting_kitchen',
        occupiedAt: '2026-06-22T10:15:00.000Z',
        serviceStartedAt: '2026-06-22T10:15:00.000Z',
      },
      floorElement: {
        id: 'floor-element-table-1',
        label: 'M1',
        type: 'table',
        x: 1,
        y: 1,
        width: 3,
        height: 3,
        shape: 'rectangle',
      },
      serviceInfo: {
        guestCount: 4,
        lineCount: 1,
        totalCents: 1250,
        currency: 'EUR',
        servicePhase: {
          course: 'mains',
          status: 'pending',
        },
        durationMinutes: 0,
      },
    });
    deferredSendToKitchen$.complete();
    fixture.detectChanges();

    expect(apiMock.chargeRestaurantServicePoint).toHaveBeenCalledTimes(1);
  });

  it('searches a table or stool, selects it, and focuses it in the floor plan', async () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    HTMLElement.prototype.focus = focus;
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: /Buscar mesa\/taburete/i }));
    fireEvent.input(screen.getByRole('searchbox', { name: /Buscar mesa\/taburete/i }), { target: { value: 'Stool 2' } });
    fixture.detectChanges();
    fireEvent.click(within(screen.getByRole('dialog', { name: /Buscar mesa\/taburete/i })).getByRole('button', { name: /Stool 2/i }));
    fixture.detectChanges();
    vi.runOnlyPendingTimers();

    expect(store.selectedTableId()).toBe('stool-2');
    expect(screen.queryByRole('dialog', { name: /Buscar mesa\/taburete/i })).toBeNull();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'center', behavior: 'smooth' });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.focus = originalFocus;
    vi.useRealTimers();
  });

  it('filters service point search by table status', async () => {
    const { fixture } = await renderServicePage();

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Buscar mesa\/taburete/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), { target: { value: 'occupied' } });
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: /Buscar mesa\/taburete/i });
    expect(within(dialog).getByRole('button', { name: /M1/ })).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: /M2/ })).toBeNull();
  });

  it('returns to the previous selected service point', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(screen.getByLabelText('M2 mesa, Libre'));
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Volver a M1' }));
    fixture.detectChanges();

    expect(store.selectedTableId()).toBe('table-1');
    expect(screen.getByRole('button', { name: 'Volver a M2' })).toBeTruthy();
  });

  it('marks cleaning and frees the selected table from the service panel', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Limpieza/i }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('cleaning');
    expect(within(screen.getByLabelText('Panel de mesa seleccionada')).getAllByText('Limpieza').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Liberar la mesa seleccionada/i }));
    fixture.detectChanges();

    expect(screen.getByRole('dialog', { name: 'Liberar mesa' })).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Liberar mesa' })).getByRole('button', { name: 'Liberar mesa' }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('free');
    expect(store.selectedOrder()?.lines).toEqual([]);
  });
});
