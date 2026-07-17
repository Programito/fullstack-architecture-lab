import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { invalidReservationCreation, invalidReservationState } from '../../shared/errors/application-error';
import { ApplicationErrorException } from '../../shared/errors/application-error-exception';
import type { RestaurantReadRepository } from '../application/ports/restaurant-read-repository.port';
import type { RestaurantServiceWindowsRepository } from '../application/ports/restaurant-service-windows-repository.port';
import type {
  CreateRestaurantReservationInput,
  RestaurantFloors,
  RestaurantMenu,
  RestaurantReservation,
  RestaurantSummary,
  ServiceWindow,
  UpdateServiceWindowInput,
} from '../domain/restaurant-read.models';
import type { OrderLineStatus, RestaurantOrderView } from '../domain/restaurant-order.models';
import { deriveServicePhase, getServiceDurationMinutes } from '../domain/service-phase';
import type {
  ServiceFloorView,
  ServiceOrderLineStatus,
  ServiceOrderStatus,
  ServicePhaseCourse,
  ServicePointDetailView,
  ServicePointOrderView,
  ServiceTableStatus,
} from '../domain/service-floor.models';

const DEMO_RESTAURANT_ID = 'restaurant-mesaflow-centro';
const DEMO_ORGANIZATION_ID = 'org-demo';

const INITIAL_RESTAURANTS: RestaurantSummary[] = [
  {
    id: DEMO_RESTAURANT_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    name: 'MesaFlow Centro',
    displayName: 'MesaFlow Centro',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    isActive: true,
  },
  {
    id: 'restaurant-other-tenant',
    organizationId: 'org-other-tenant',
    name: 'Otro Inquilino',
    displayName: 'Otro Inquilino',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    isActive: true,
  },
];

const INITIAL_MENUS = new Map<string, RestaurantMenu>([
  [
    DEMO_RESTAURANT_ID,
    {
      id: 'menu-demo-main',
      restaurantId: DEMO_RESTAURANT_ID,
      name: 'Carta principal',
      isActive: true,
      sections: [
        {
          id: 'menu-section-drinks',
          name: 'Bebidas',
          nameI18n: { es: 'Bebidas', ca: 'Begudes', en: 'Drinks' },
          sortOrder: 1,
          isVisible: true,
          items: [
            {
              id: 'menu-item-coke',
              name: 'Coca-Cola',
              nameI18n: { es: 'Coca-Cola', ca: 'Coca-Cola', en: 'Coke' },
              imageUrl: null,
              productType: 'simple',
              priceCents: 300,
              currency: 'EUR',
              isAvailable: true,
              modifierGroups: [
                {
                  id: 'modifier-group-drink-size',
                  name: 'Tamaño de bebida',
                  nameI18n: { es: 'Tamaño de bebida', ca: 'Mida de beguda', en: 'Drink size' },
                  selectionType: 'single',
                  minSelections: 1,
                  maxSelections: 1,
                  isRequired: true,
                  options: [
                    {
                      id: 'modifier-option-drink-size-medium',
                      name: 'Mediana',
                      nameI18n: { es: 'Mediana', ca: 'Mitjana', en: 'Medium' },
                      priceDeltaCents: 0,
                      isAvailable: true,
                    },
                    {
                      id: 'modifier-option-drink-size-large',
                      name: 'Grande',
                      nameI18n: { es: 'Grande', ca: 'Gran', en: 'Large' },
                      priceDeltaCents: 80,
                      isAvailable: true,
                    },
                    {
                      id: 'modifier-option-drink-size-xl',
                      name: 'XL',
                      nameI18n: { es: 'XL', ca: 'XL', en: 'XL' },
                      priceDeltaCents: 120,
                      isAvailable: true,
                    },
                  ],
                },
              ],
            },
            {
              id: 'menu-item-water',
              name: 'Agua mineral',
              nameI18n: { es: 'Agua mineral', ca: 'Aigua mineral', en: 'Mineral water' },
              imageUrl: null,
              productType: 'simple',
              priceCents: 250,
              currency: 'EUR',
              isAvailable: true,
            },
            {
              id: 'menu-item-beer',
              name: 'Cerveza',
              nameI18n: { es: 'Cerveza', ca: 'Cervesa', en: 'Beer' },
              imageUrl: null,
              productType: 'simple',
              priceCents: 350,
              currency: 'EUR',
              isAvailable: true,
            },
          ],
        },
        {
          id: 'menu-section-mains',
          name: 'Principales',
          nameI18n: { es: 'Principales', ca: 'Principals', en: 'Mains' },
          sortOrder: 2,
          isVisible: true,
          items: [
            { id: 'menu-item-burger', name: 'Hamburguesa craft', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/hamburguesa-craft.jpg', productType: 'simple', priceCents: 1250, currency: 'EUR', isAvailable: true },
            { id: 'menu-item-croquetas', name: 'Croquetas de jamon iberico', imageUrl: null, productType: 'simple', priceCents: 980, currency: 'EUR', isAvailable: true },
            { id: 'menu-item-combo', name: 'Menu Classic Burger', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/menu-classic-burger.jpg', productType: 'combo', priceCents: 1390, currency: 'EUR', isAvailable: true },
            { id: 'menu-item-platter', name: 'Plato combinado vegetal', imageUrl: null, productType: 'platter', priceCents: 1190, currency: 'EUR', isAvailable: true },
          ],
        },
      ],
    },
  ],
]);

const INITIAL_FLOORS = new Map<string, RestaurantFloors>([
  [
    DEMO_RESTAURANT_ID,
    {
      restaurantId: DEMO_RESTAURANT_ID,
      tables: [
        { id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, isActive: true },
        { id: 'table-2', tableNumber: 2, name: 'Mesa 2', capacity: 4, isActive: true },
        { id: 'table-3', tableNumber: 3, name: 'Mesa 3', capacity: 6, isActive: true },
        { id: 'table-4', tableNumber: 4, name: 'Mesa 4', capacity: 4, isActive: true },
        { id: 'stool-1', tableNumber: 5, name: 'Taburete 1', capacity: 1, isActive: true },
        { id: 'stool-2', tableNumber: 6, name: 'Taburete 2', capacity: 1, isActive: true },
        { id: 'stool-3', tableNumber: 7, name: 'Taburete 3', capacity: 1, isActive: true },
      ],
      floors: [
        {
          id: 'floor-main',
          name: 'Sala principal',
          rows: 12,
          columns: 16,
          elements: [
            { id: 'floor-element-1', type: 'table', label: 'M1', x: 1, y: 1, width: 2, height: 2, tableId: 'table-1', shape: 'square', sortOrder: 1 },
            { id: 'floor-element-2', type: 'table', label: 'M2', x: 5, y: 1, width: 2, height: 2, tableId: 'table-2', shape: 'square', sortOrder: 2 },
            { id: 'floor-element-3', type: 'table', label: 'M3', x: 9, y: 1, width: 2, height: 2, tableId: 'table-3', shape: 'rectangle', sortOrder: 3 },
            { id: 'floor-element-4', type: 'table', label: 'M4', x: 12, y: 4, width: 2, height: 2, tableId: 'table-4', shape: 'round', sortOrder: 4 },
            { id: 'floor-element-5', type: 'bar', label: 'Bar', x: 1, y: 7, width: 3, height: 1, tableId: null, shape: null, sortOrder: 5 },
            { id: 'floor-element-6', type: 'kitchen', label: 'Kitchen', x: 6, y: 7, width: 3, height: 1, tableId: null, shape: null, sortOrder: 6 },
            { id: 'floor-element-7', type: 'entrance', label: 'Entrance', x: 8, y: 0, width: 2, height: 1, tableId: null, shape: null, sortOrder: 7 },
          ],
        },
      ],
    },
  ],
]);

const INITIAL_RESERVATIONS = new Map<string, RestaurantReservation[]>([
  [
    DEMO_RESTAURANT_ID,
    [
      {
        id: 'reservation-demo-lunch',
        customerId: 'customer-laura',
        customerNameSnapshot: 'Laura Gomez',
        customerPhoneSnapshot: '+34 600 111 222',
        partySize: 2,
        reservationAt: '2026-06-21T13:30:00.000Z',
        durationMinutes: 90,
        status: 'confirmed',
        notes: 'Mesa tranquila.',
        tableIds: ['table-1'],
        tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }],
        depositAmountCents: 1000,
        depositPaidAt: '2026-06-20T18:00:00.000Z',
      },
      {
        id: 'reservation-demo-group',
        customerId: 'customer-diego',
        customerNameSnapshot: 'Diego Martin',
        customerPhoneSnapshot: '+34 600 333 444',
        partySize: 8,
        reservationAt: '2026-06-21T21:00:00.000Z',
        durationMinutes: 120,
        status: 'pending',
        notes: 'Grupo de cena de empresa.',
        tableIds: ['table-3', 'table-4'],
        tables: [
          { id: 'table-3', tableNumber: 3, name: 'Mesa 3' },
          { id: 'table-4', tableNumber: 4, name: 'Mesa 4' },
        ],
        depositAmountCents: 4000,
        depositPaidAt: '2026-06-20T19:30:00.000Z',
      },
    ],
  ],
]);

type DemoOrderLine = {
  id: string;
  productName: string;
  productType: 'simple' | 'combo' | 'platter';
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  status: ServiceOrderLineStatus;
  course: Exclude<ServicePhaseCourse, 'mixed' | 'none'>;
  preparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
  kitchenNote: string | null;
  updatedAt: string;
  modifiers: Array<{ groupName: string; optionName: string; priceDeltaCents: number; quantity: number }>;
  comboSlots: Array<{ slotName: string; selectedProductName: string; supplementPriceCents: number; quantity: number }>;
};

type DemoOrder = {
  id: string;
  tableId: string;
  status: ServiceOrderStatus;
  openedAt: string;
  updatedAt: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  lines: DemoOrderLine[];
};

type DemoTableServiceState = {
  status: ServiceTableStatus;
  occupiedAt: string | null;
  serviceStartedAt: string | null;
};

const INITIAL_SERVICE_ORDERS = new Map<string, DemoOrder[]>([
  [
    DEMO_RESTAURANT_ID,
    [
      {
        id: 'order-demo-service',
        tableId: 'table-3',
        status: 'open',
        openedAt: '2026-06-21T12:00:00.000Z',
        updatedAt: '2026-06-21T12:25:00.000Z',
        subtotalCents: 2940,
        taxCents: 0,
        totalCents: 2940,
        currency: 'EUR',
        lines: [
          {
            id: 'line-burger',
            productName: 'Hamburguesa craft',
            productType: 'simple',
            quantity: 1,
            unitPriceCents: 1350,
            subtotalCents: 1350,
            status: 'preparing',
            course: 'mains',
            preparationRoute: 'kitchen',
            kitchenNote: 'Sin cebolla',
            updatedAt: '2026-06-21T12:20:00.000Z',
            modifiers: [],
            comboSlots: [],
          },
          {
            id: 'line-combo',
            productName: 'Menu Classic Burger',
            productType: 'combo',
            quantity: 1,
            unitPriceCents: 1590,
            subtotalCents: 1590,
            status: 'pending',
            course: 'mains',
            preparationRoute: 'kitchen',
            kitchenNote: null,
            updatedAt: '2026-06-21T12:24:00.000Z',
            modifiers: [],
            comboSlots: [
              { slotName: 'Hamburguesa', selectedProductName: 'Classic Burger', supplementPriceCents: 0, quantity: 1 },
              { slotName: 'Bebida', selectedProductName: 'Agua mineral', supplementPriceCents: 0, quantity: 1 },
              { slotName: 'Acompañamiento', selectedProductName: 'Patatas fritas', supplementPriceCents: 0, quantity: 1 },
            ],
          },
        ],
      },
      {
        id: 'order-demo-bar',
        tableId: 'table-2',
        status: 'payment_pending',
        openedAt: '2026-06-21T11:40:00.000Z',
        updatedAt: '2026-06-21T12:10:00.000Z',
        subtotalCents: 880,
        taxCents: 0,
        totalCents: 880,
        currency: 'EUR',
        lines: [
          {
            id: 'line-bar-beer-1',
            productName: 'Cerveza',
            productType: 'simple',
            quantity: 2,
            unitPriceCents: 350,
            subtotalCents: 700,
            status: 'served',
            course: 'drinks',
            preparationRoute: 'bar',
            kitchenNote: null,
            updatedAt: '2026-06-21T12:05:00.000Z',
            modifiers: [],
            comboSlots: [],
          },
          {
            id: 'line-bar-coffee',
            productName: 'Cafe solo',
            productType: 'simple',
            quantity: 1,
            unitPriceCents: 180,
            subtotalCents: 180,
            status: 'served',
            course: 'drinks',
            preparationRoute: 'bar',
            kitchenNote: null,
            updatedAt: '2026-06-21T12:08:00.000Z',
            modifiers: [],
            comboSlots: [],
          },
        ],
      },
      {
        id: 'order-demo-group',
        tableId: 'table-4',
        status: 'payment_pending',
        openedAt: '2026-06-21T11:15:00.000Z',
        updatedAt: '2026-06-21T12:00:00.000Z',
        subtotalCents: 1830,
        taxCents: 0,
        totalCents: 1830,
        currency: 'EUR',
        lines: [
          {
            id: 'line-group-nachos',
            productName: 'Nachos caseros',
            productType: 'simple',
            quantity: 1,
            unitPriceCents: 990,
            subtotalCents: 990,
            status: 'served',
            course: 'starters',
            preparationRoute: 'kitchen',
            kitchenNote: null,
            updatedAt: '2026-06-21T11:55:00.000Z',
            modifiers: [],
            comboSlots: [],
          },
          {
            id: 'line-group-dessert',
            productName: 'Tarta de queso',
            productType: 'simple',
            quantity: 2,
            unitPriceCents: 470,
            subtotalCents: 940,
            status: 'served',
            course: 'desserts',
            preparationRoute: 'dessert_station',
            kitchenNote: null,
            updatedAt: '2026-06-21T11:58:00.000Z',
            modifiers: [],
            comboSlots: [],
          },
        ],
      },
      {
        id: 'order-demo-paid',
        tableId: 'table-1',
        status: 'paid',
        openedAt: '2026-06-21T10:45:00.000Z',
        updatedAt: '2026-06-21T11:30:00.000Z',
        subtotalCents: 1190,
        taxCents: 0,
        totalCents: 1071,
        currency: 'EUR',
        lines: [
          {
            id: 'line-paid-burger',
            productName: 'Hamburguesa craft',
            productType: 'simple',
            quantity: 1,
            unitPriceCents: 1190,
            subtotalCents: 1190,
            status: 'served',
            course: 'mains',
            preparationRoute: 'kitchen',
            kitchenNote: null,
            updatedAt: '2026-06-21T11:25:00.000Z',
            modifiers: [],
            comboSlots: [],
          },
        ],
      },
    ],
  ],
]);

const INITIAL_TABLE_SERVICE_STATE = new Map<string, Record<string, DemoTableServiceState>>([
  [
    DEMO_RESTAURANT_ID,
    {
      'table-1': { status: 'paid', occupiedAt: '2026-06-21T10:45:00.000Z', serviceStartedAt: '2026-06-21T10:45:00.000Z' },
      'table-2': { status: 'payment_pending', occupiedAt: '2026-06-21T11:40:00.000Z', serviceStartedAt: '2026-06-21T11:40:00.000Z' },
      'table-3': { status: 'waiting_kitchen', occupiedAt: '2026-06-21T12:00:00.000Z', serviceStartedAt: '2026-06-21T12:00:00.000Z' },
      'table-4': { status: 'payment_pending', occupiedAt: '2026-06-21T11:15:00.000Z', serviceStartedAt: '2026-06-21T11:15:00.000Z' },
      'stool-1': { status: 'free', occupiedAt: null, serviceStartedAt: null },
      'stool-2': { status: 'reserved', occupiedAt: null, serviceStartedAt: null },
      'stool-3': { status: 'free', occupiedAt: null, serviceStartedAt: null },
    },
  ],
]);

const INITIAL_SERVICE_WINDOWS = new Map<string, ServiceWindow[]>([
  [
    DEMO_RESTAURANT_ID,
    [
      { id: 'sw-lunch', restaurantId: DEMO_RESTAURANT_ID, name: 'Comidas', startTime: '12:00', endTime: '16:30', sortOrder: 1 },
      { id: 'sw-dinner', restaurantId: DEMO_RESTAURANT_ID, name: 'Cenas', startTime: '20:00', endTime: '23:30', sortOrder: 2 },
    ],
  ],
]);

@Injectable()
export class DemoRestaurantReadRepository implements RestaurantReadRepository, RestaurantServiceWindowsRepository {
  private restaurants = structuredClone(INITIAL_RESTAURANTS);
  private menus = structuredClone([...INITIAL_MENUS.entries()]) as Array<[string, RestaurantMenu]>;
  private floors = structuredClone([...INITIAL_FLOORS.entries()]) as Array<[string, RestaurantFloors]>;
  private reservations = structuredClone([...INITIAL_RESERVATIONS.entries()]) as Array<[string, RestaurantReservation[]]>;
  private serviceOrders = structuredClone([...INITIAL_SERVICE_ORDERS.entries()]) as Array<[string, DemoOrder[]]>;
  private tableStates = structuredClone([...INITIAL_TABLE_SERVICE_STATE.entries()]) as Array<[string, Record<string, DemoTableServiceState>]>;
  private serviceWindows = structuredClone([...INITIAL_SERVICE_WINDOWS.entries()]) as Array<[string, ServiceWindow[]]>;

  reset(): void {
    this.restaurants = structuredClone(INITIAL_RESTAURANTS);
    this.menus = structuredClone([...INITIAL_MENUS.entries()]) as Array<[string, RestaurantMenu]>;
    this.floors = structuredClone([...INITIAL_FLOORS.entries()]) as Array<[string, RestaurantFloors]>;
    this.reservations = structuredClone([...INITIAL_RESERVATIONS.entries()]) as Array<[string, RestaurantReservation[]]>;
    this.serviceOrders = structuredClone([...INITIAL_SERVICE_ORDERS.entries()]) as Array<[string, DemoOrder[]]>;
    this.tableStates = structuredClone([...INITIAL_TABLE_SERVICE_STATE.entries()]) as Array<[string, Record<string, DemoTableServiceState>]>;
    this.serviceWindows = structuredClone([...INITIAL_SERVICE_WINDOWS.entries()]) as Array<[string, ServiceWindow[]]>;
  }

  async findServiceWindowsByRestaurantId(restaurantId: string): Promise<ServiceWindow[] | null> {
    const windows = new Map(this.serviceWindows).get(restaurantId);
    return windows ? structuredClone(windows) : null;
  }

  async updateServiceWindows(restaurantId: string, windows: UpdateServiceWindowInput[]): Promise<ServiceWindow[] | null> {
    const windowsMap = new Map(this.serviceWindows);
    if (!windowsMap.has(restaurantId)) return null;

    const updated: ServiceWindow[] = windows.map((w, index) => ({
      id: `sw-${restaurantId}-${index + 1}`,
      restaurantId,
      name: w.name,
      startTime: w.startTime,
      endTime: w.endTime,
      sortOrder: index + 1,
    }));

    windowsMap.set(restaurantId, updated);
    this.serviceWindows = [...windowsMap.entries()];
    return structuredClone(updated);
  }

  async listRestaurants(restaurantIds: string[], organizationIds: string[]): Promise<RestaurantSummary[]> {
    if (restaurantIds.length === 0 && organizationIds.length === 0) return [];
    const all = this.restaurants.map((restaurant) => ({ ...restaurant }));
    return all.filter((r) => restaurantIds.includes(r.id) || organizationIds.includes(r.organizationId));
  }

  async findMenuByRestaurantId(restaurantId: string): Promise<RestaurantMenu | null> {
    const menu = new Map(this.menus).get(restaurantId);
    return menu ? structuredClone(menu) : null;
  }

  async findFloorsByRestaurantId(restaurantId: string): Promise<RestaurantFloors | null> {
    const floors = new Map(this.floors).get(restaurantId);
    return floors ? structuredClone(floors) : null;
  }

  async listReservationsByRestaurantId(restaurantId: string, date?: string): Promise<RestaurantReservation[] | null> {
    const reservations = new Map(this.reservations).get(restaurantId);
    if (!reservations) return null;
    const sorted = structuredClone(reservations).sort((left, right) => left.reservationAt.localeCompare(right.reservationAt));
    return date ? sorted.filter((r) => r.reservationAt.startsWith(date)) : sorted;
  }

  async findReservationById(restaurantId: string, reservationId: string): Promise<RestaurantReservation | null> {
    const reservations = new Map(this.reservations).get(restaurantId);
    if (!reservations) return null;
    const reservation = reservations.find((r) => r.id === reservationId);
    return reservation ? structuredClone(reservation) : null;
  }

  async findConflictingReservations(restaurantId: string, tableId: string, startTime: Date, endTime: Date): Promise<string[]> {
    const reservations = new Map(this.reservations).get(restaurantId) ?? [];
    return reservations
      .filter((r) => {
        if (r.status === 'cancelled' || r.status === 'no_show') return false;
        if (!r.tableIds.includes(tableId)) return false;
        const rStart = new Date(r.reservationAt);
        const rEnd = new Date(rStart.getTime() + r.durationMinutes * 60 * 1000);
        return rStart < endTime && rEnd > startTime;
      })
      .map((r) => r.id);
  }

  async findTableCapacity(restaurantId: string, tableId: string): Promise<number | null> {
    const floorsResult = await this.findFloorsByRestaurantId(restaurantId);
    if (!floorsResult) return null;
    const table = floorsResult.tables.find((t) => t.id === tableId);
    return table?.capacity ?? null;
  }

  async createReservation(
    restaurantId: string,
    reservation: CreateRestaurantReservationInput,
  ): Promise<RestaurantReservation | null> {
    const reservationsMap = new Map(this.reservations);
    const reservations = reservationsMap.get(restaurantId);
    if (!reservations) return null;

    const floors = new Map(this.floors).get(restaurantId);
    const tables = floors?.tables ?? [];
    const selectedTables = reservation.tableIds.map((tableId) => tables.find((table) => table.id === tableId) ?? null);

    if (selectedTables.some((table) => table === null)) {
      throw new ApplicationErrorException(
        invalidReservationCreation({
          reason: 'invalid_table_ids',
          restaurantId,
          tableIds: reservation.tableIds,
        }),
      );
    }

    const created: RestaurantReservation = {
      id: `reservation-${randomUUID()}`,
      customerId: null,
      customerNameSnapshot: reservation.customerNameSnapshot,
      customerPhoneSnapshot: reservation.customerPhoneSnapshot,
      partySize: reservation.partySize,
      reservationAt: reservation.reservationAt,
      durationMinutes: reservation.durationMinutes,
      status: 'pending',
      notes: reservation.notes,
      tableIds: reservation.tableIds,
      tables: selectedTables.map((table) => ({
        id: table!.id,
        tableNumber: table!.tableNumber,
        name: table!.name,
      })),
      depositAmountCents: reservation.depositAmountCents,
      depositPaidAt: reservation.depositPaidAt,
    };

    reservations.push(created);
    reservations.sort((left, right) => left.reservationAt.localeCompare(right.reservationAt));
    reservationsMap.set(restaurantId, reservations);
    this.reservations = [...reservationsMap.entries()];

    return structuredClone(created);
  }

  async updateReservationStatus(
    restaurantId: string,
    reservationId: string,
    status: RestaurantReservation['status'],
    cancelledByOrigin?: string | null,
  ): Promise<RestaurantReservation | null> {
    const reservationsMap = new Map(this.reservations);
    const reservations = reservationsMap.get(restaurantId);
    if (!reservations) return null;

    const reservationIndex = reservations.findIndex((reservation) => reservation.id === reservationId);
    if (reservationIndex < 0) return null;

    const reservation = reservations[reservationIndex]!;
    if (!canTransitionReservationStatus(reservation.status, status)) {
      throw new ApplicationErrorException(
        invalidReservationState({
          restaurantId,
          reservationId,
          from: reservation.status,
          to: status,
        }),
      );
    }

    reservations[reservationIndex] = {
      ...reservation,
      status,
      ...(status === 'cancelled' ? { cancelledByOrigin: cancelledByOrigin ?? null } : {}),
    };
    reservationsMap.set(restaurantId, reservations);
    this.reservations = [...reservationsMap.entries()];

    return structuredClone(reservations[reservationIndex]!);
  }

  async findServiceFloorByRestaurantId(restaurantId: string): Promise<ServiceFloorView | null> {
    const floors = new Map(this.floors).get(restaurantId);
    if (!floors) return null;

    const floor = floors.floors[0];
    if (!floor) return null;

    const servicePoints: ServiceFloorView['servicePoints'] = floors.tables
      .map((table) => {
        const floorElement = floor.elements.find((element) => element.tableId === table.id);
        if (!floorElement) return null;

        const tableState = this.getTableState(restaurantId, table.id);
        const activeOrder = this.getActiveOrder(restaurantId, table.id);
        const summary = this.createServiceSummary(activeOrder, table.capacity);

        return {
          table: {
            id: table.id,
            tableNumber: table.tableNumber,
            name: table.name,
            capacity: table.capacity,
            status: tableState.status,
            serviceStartedAt: tableState.serviceStartedAt,
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
        occupiedCount: servicePoints.filter((servicePoint) => this.isOccupiedStatus(servicePoint.table.status)).length,
        openOrderCount: servicePoints.filter((servicePoint) => this.getActiveOrder(restaurantId, servicePoint.table.id) !== null).length,
      },
    };
  }

  async findServicePointByRestaurantId(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null> {
    const floors = new Map(this.floors).get(restaurantId);
    if (!floors) return null;

    const table = floors.tables.find((candidate) => candidate.id === tableId);
    if (!table) return null;

    const floor = floors.floors[0];
    const floorElement = floor?.elements.find((element) => element.tableId === tableId) ?? null;
    const tableState = this.getTableState(restaurantId, tableId);
    const activeOrder = this.getActiveOrder(restaurantId, tableId);
    const summary = this.createServiceSummary(activeOrder, table.capacity);

    return {
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        name: table.name,
        capacity: table.capacity,
        status: tableState.status,
        occupiedAt: tableState.occupiedAt,
        serviceStartedAt: tableState.serviceStartedAt,
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
        ...summary,
        durationMinutes: getServiceDurationMinutes(tableState.occupiedAt, tableState.serviceStartedAt, new Date('2026-06-21T12:34:00.000Z')),
      },
    };
  }

  async findServicePointOrderByRestaurantId(restaurantId: string, tableId: string): Promise<ServicePointOrderView | null> {
    const floors = new Map(this.floors).get(restaurantId);
    if (!floors || !floors.tables.some((candidate) => candidate.id === tableId)) return null;

    const activeOrder = this.getActiveOrder(restaurantId, tableId);
    if (!activeOrder) {
      return { order: null, lines: [] };
    }

    return {
      order: {
        id: activeOrder.id,
        tableId: activeOrder.tableId,
        status: activeOrder.status,
        openedAt: activeOrder.openedAt,
        updatedAt: activeOrder.updatedAt,
        subtotalCents: activeOrder.subtotalCents,
        taxCents: activeOrder.taxCents,
        totalCents: activeOrder.totalCents,
        currency: activeOrder.currency,
      },
      lines: activeOrder.lines.map((line) => ({
        id: line.id,
        productName: line.productName,
        productType: line.productType,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        subtotalCents: line.subtotalCents,
        taxRateName: null,
        taxRatePercent: null,
        taxCents: 0,
        status: line.status,
        course: line.course,
        preparationRoute: line.preparationRoute,
        kitchenNote: line.kitchenNote,
        updatedAt: line.updatedAt,
        modifiers: line.modifiers,
        comboSlots: line.comboSlots,
      })),
    };
  }

  async occupyServicePoint(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null> {
    const floors = new Map(this.floors).get(restaurantId);
    if (!floors || !floors.tables.some((candidate) => candidate.id === tableId)) {
      return null;
    }

    const nextTimestamp = new Date().toISOString();
    const tableStatesMap = new Map(this.tableStates);
    const restaurantTableStates = structuredClone(tableStatesMap.get(restaurantId) ?? {});
    const currentTableState = restaurantTableStates[tableId] ?? {
      status: 'free' as const,
      occupiedAt: null,
      serviceStartedAt: null,
    };

    restaurantTableStates[tableId] = {
      status: 'occupied',
      occupiedAt:
        currentTableState.status === 'occupied' ||
        currentTableState.status === 'waiting_kitchen' ||
        currentTableState.status === 'served' ||
        currentTableState.status === 'payment_pending'
          ? currentTableState.occupiedAt ?? nextTimestamp
          : nextTimestamp,
      serviceStartedAt:
        currentTableState.status === 'occupied' ||
        currentTableState.status === 'waiting_kitchen' ||
        currentTableState.status === 'served' ||
        currentTableState.status === 'payment_pending'
          ? currentTableState.serviceStartedAt ?? nextTimestamp
          : nextTimestamp,
    };

    tableStatesMap.set(restaurantId, restaurantTableStates);
    this.tableStates = [...tableStatesMap.entries()];

    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async sendServicePointOrderToKitchen(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null> {
    const floors = new Map(this.floors).get(restaurantId);
    if (!floors || !floors.tables.some((candidate) => candidate.id === tableId)) {
      return null;
    }

    const ordersMap = new Map(this.serviceOrders);
    const restaurantOrders = structuredClone(ordersMap.get(restaurantId) ?? []);
    const orderIndex = restaurantOrders.findIndex((order) => order.tableId === tableId && order.status !== 'paid');

    if (orderIndex < 0) {
      return null;
    }

    const now = new Date().toISOString();
    const currentOrder = restaurantOrders[orderIndex]!;
    restaurantOrders[orderIndex] = {
      ...currentOrder,
      status: 'sent_to_kitchen',
      updatedAt: now,
      lines: currentOrder.lines.map((line) =>
        line.status === 'pending'
          ? { ...line, status: 'sent_to_kitchen' as const, updatedAt: now }
          : line,
      ),
    };

    ordersMap.set(restaurantId, restaurantOrders);
    this.serviceOrders = [...ordersMap.entries()];

    const tableStatesMap = new Map(this.tableStates);
    const restaurantTableStates = structuredClone(tableStatesMap.get(restaurantId) ?? {});
    const currentTableState = restaurantTableStates[tableId] ?? {
      status: 'free' as const,
      occupiedAt: null,
      serviceStartedAt: null,
    };

    restaurantTableStates[tableId] = {
      status: 'waiting_kitchen',
      occupiedAt: currentTableState.occupiedAt ?? now,
      serviceStartedAt: currentTableState.serviceStartedAt ?? now,
    };

    tableStatesMap.set(restaurantId, restaurantTableStates);
    this.tableStates = [...tableStatesMap.entries()];

    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async markServicePointOrderServed(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null> {
    const floors = new Map(this.floors).get(restaurantId);
    if (!floors || !floors.tables.some((candidate) => candidate.id === tableId)) {
      return null;
    }

    const ordersMap = new Map(this.serviceOrders);
    const restaurantOrders = structuredClone(ordersMap.get(restaurantId) ?? []);
    const orderIndex = restaurantOrders.findIndex((order) => order.tableId === tableId && order.status !== 'paid');

    if (orderIndex < 0) {
      return null;
    }

    const now = new Date().toISOString();
    const currentOrder = restaurantOrders[orderIndex]!;
    restaurantOrders[orderIndex] = {
      ...currentOrder,
      status: 'served',
      updatedAt: now,
      lines: currentOrder.lines.map((line) =>
        line.status === 'cancelled'
          ? line
          : { ...line, status: 'served' as const, updatedAt: now },
      ),
    };

    ordersMap.set(restaurantId, restaurantOrders);
    this.serviceOrders = [...ordersMap.entries()];

    const tableStatesMap = new Map(this.tableStates);
    const restaurantTableStates = structuredClone(tableStatesMap.get(restaurantId) ?? {});
    const currentTableState = restaurantTableStates[tableId] ?? {
      status: 'free' as const,
      occupiedAt: null,
      serviceStartedAt: null,
    };

    restaurantTableStates[tableId] = {
      status: 'served',
      occupiedAt: currentTableState.occupiedAt ?? now,
      serviceStartedAt: currentTableState.serviceStartedAt ?? now,
    };

    tableStatesMap.set(restaurantId, restaurantTableStates);
    this.tableStates = [...tableStatesMap.entries()];

    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async chargeServicePoint(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null> {
    const floors = new Map(this.floors).get(restaurantId);
    if (!floors || !floors.tables.some((candidate) => candidate.id === tableId)) {
      return null;
    }

    const ordersMap = new Map(this.serviceOrders);
    const restaurantOrders = structuredClone(ordersMap.get(restaurantId) ?? []);
    const orderIndex = restaurantOrders.findIndex((order) => order.tableId === tableId && order.status !== 'paid');

    if (orderIndex >= 0) {
      restaurantOrders[orderIndex] = {
        ...restaurantOrders[orderIndex]!,
        status: 'paid',
        updatedAt: new Date().toISOString(),
      };
      ordersMap.set(restaurantId, restaurantOrders);
      this.serviceOrders = [...ordersMap.entries()];
    }

    const tableStatesMap = new Map(this.tableStates);
    const restaurantTableStates = structuredClone(tableStatesMap.get(restaurantId) ?? {});
    const currentTableState = restaurantTableStates[tableId] ?? {
      status: 'free' as const,
      occupiedAt: null,
      serviceStartedAt: null,
    };

    restaurantTableStates[tableId] = {
      status: 'paid',
      occupiedAt: currentTableState.occupiedAt,
      serviceStartedAt: currentTableState.serviceStartedAt,
    };

    tableStatesMap.set(restaurantId, restaurantTableStates);
    this.tableStates = [...tableStatesMap.entries()];

    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async setServicePointStatus(restaurantId: string, tableId: string, status: ServiceTableStatus): Promise<ServicePointDetailView | null> {
    const floors = new Map(this.floors).get(restaurantId);
    if (!floors || !floors.tables.some((candidate) => candidate.id === tableId)) {
      return null;
    }

    const tableStatesMap = new Map(this.tableStates);
    const restaurantTableStates = structuredClone(tableStatesMap.get(restaurantId) ?? {});
    const currentTableState = restaurantTableStates[tableId] ?? { status: 'free' as const, occupiedAt: null, serviceStartedAt: null };
    const now = new Date().toISOString();

    restaurantTableStates[tableId] = {
      status,
      occupiedAt: currentTableState.occupiedAt ?? now,
      serviceStartedAt: currentTableState.serviceStartedAt ?? now,
    };

    tableStatesMap.set(restaurantId, restaurantTableStates);
    this.tableStates = [...tableStatesMap.entries()];

    return this.findServicePointByRestaurantId(restaurantId, tableId);
  }

  async reorderFloorElements(
    restaurantId: string,
    floorId: string,
    elements: Array<{ id: string; x: number; y: number; width: number; height: number; sortOrder: number }>,
  ): Promise<RestaurantFloors | null> {
    const floorsMap = new Map(this.floors);
    const floors = floorsMap.get(restaurantId);
    if (!floors) return null;

    const floor = floors.floors.find((candidate) => candidate.id === floorId);
    if (!floor) return null;

    const updatesById = new Map(elements.map((element) => [element.id, element]));
    floor.elements = floor.elements
      .map((element) => {
        const update = updatesById.get(element.id);
        return update ? { ...element, ...update } : element;
      })
      .sort((left, right) => left.sortOrder - right.sortOrder);

    floorsMap.set(restaurantId, structuredClone(floors));
    this.floors = [...floorsMap.entries()];
    return structuredClone(floors);
  }

  async updateFloor(
    restaurantId: string,
    floorId: string,
    floorUpdate: { name: string; rows: number; columns: number },
  ): Promise<RestaurantFloors | null> {
    const floorsMap = new Map(this.floors);
    const floors = floorsMap.get(restaurantId);
    if (!floors) return null;

    const floor = floors.floors.find((candidate) => candidate.id === floorId);
    if (!floor) return null;

    floor.name = floorUpdate.name;
    floor.rows = floorUpdate.rows;
    floor.columns = floorUpdate.columns;

    floorsMap.set(restaurantId, structuredClone(floors));
    this.floors = [...floorsMap.entries()];
    return structuredClone(floors);
  }

  async updateFloorElement(
    restaurantId: string,
    floorId: string,
    elementId: string,
    elementUpdate: {
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      shape: 'round' | 'square' | 'rectangle' | 'long' | null;
      capacity: number | null;
    },
  ): Promise<RestaurantFloors | null> {
    const floorsMap = new Map(this.floors);
    const floors = floorsMap.get(restaurantId);
    if (!floors) return null;

    const floor = floors.floors.find((candidate) => candidate.id === floorId);
    if (!floor) return null;

    const existingElement = floor.elements.find((candidate) => candidate.id === elementId);
    if (!existingElement) return null;

    floor.elements = floor.elements.map((element) =>
      element.id === elementId
        ? {
            ...element,
            label: elementUpdate.label,
            x: elementUpdate.x,
            y: elementUpdate.y,
            width: elementUpdate.width,
            height: elementUpdate.height,
            shape: elementUpdate.shape,
          }
        : element,
    );

    if (existingElement.tableId) {
      floors.tables = floors.tables.map((table) =>
        table.id === existingElement.tableId
          ? {
              ...table,
              name: elementUpdate.label,
              capacity: elementUpdate.capacity ?? table.capacity,
            }
          : table,
      );
    }

    floorsMap.set(restaurantId, structuredClone(floors));
    this.floors = [...floorsMap.entries()];
    return structuredClone(floors);
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
    const floorsMap = new Map(this.floors);
    const floors = floorsMap.get(restaurantId);
    if (!floors) return null;

    const floor = floors.floors.find((candidate) => candidate.id === floorId);
    if (!floor) return null;

    let tableId = element.tableId;
    if ((element.type === 'table' || element.type === 'stool') && !tableId) {
      const nextTableNumber = Math.max(0, ...floors.tables.map((table) => table.tableNumber)) + 1;
      tableId = element.type === 'stool' ? `stool-${nextTableNumber}` : `table-${nextTableNumber}`;
      floors.tables = [
        ...floors.tables,
        {
          id: tableId,
          tableNumber: nextTableNumber,
          name: element.label,
          capacity: element.type === 'stool' ? 1 : 4,
          isActive: true,
        },
      ];
    }

    floor.elements = [...floor.elements, { id: `floor-element-${randomUUID()}`, ...element, tableId }].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );

    floorsMap.set(restaurantId, structuredClone(floors));
    this.floors = [...floorsMap.entries()];
    return structuredClone(floors);
  }

  private getOrders(restaurantId: string): DemoOrder[] {
    return structuredClone(new Map(this.serviceOrders).get(restaurantId) ?? []);
  }

  private getActiveOrder(restaurantId: string, tableId: string): DemoOrder | null {
    return this.getOrders(restaurantId).find((order) => order.tableId === tableId && order.status !== 'paid') ?? null;
  }

  private getTableState(restaurantId: string, tableId: string): DemoTableServiceState {
    const states = new Map(this.tableStates).get(restaurantId) ?? {};
    return states[tableId] ?? { status: 'free', occupiedAt: null, serviceStartedAt: null };
  }

  private createServiceSummary(order: DemoOrder | null, guestCount: number): ServiceFloorView['servicePoints'][number]['summary'] {
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
      guestCount,
      totalCents: order.totalCents,
      currency: order.currency,
      servicePhase: deriveServicePhase(order.lines.map((line) => ({ status: line.status, course: line.course }))),
    };
  }

  async updateServiceOrderLineStatus(
    restaurantId: string,
    orderId: string,
    lineId: string,
    status: 'sent_to_kitchen' | 'preparing' | 'ready' | 'served',
  ): Promise<RestaurantOrderView | null> {
    const ordersMap = new Map(this.serviceOrders);
    const orders = ordersMap.get(restaurantId);
    if (!orders) return null;

    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) return null;

    const order = orders[orderIndex];
    const lineIndex = order.lines.findIndex((l) => l.id === lineId);
    if (lineIndex === -1) return null;

    const now = new Date().toISOString();
    const updatedLines = order.lines.map((line, idx) =>
      idx === lineIndex ? { ...line, status, updatedAt: now } : line,
    );
    const updatedOrder = { ...order, lines: updatedLines, updatedAt: now };
    const updatedOrders = orders.map((o, idx) => (idx === orderIndex ? updatedOrder : o));
    ordersMap.set(restaurantId, updatedOrders);
    this.serviceOrders = [...ordersMap.entries()];

    return this.buildDemoOrderView(restaurantId, updatedOrder);
  }

  private buildDemoOrderView(restaurantId: string, order: DemoOrder): RestaurantOrderView {
    // Numero de ticket del modo demo: posicion 1-based del pedido dentro de su restaurante
    // (estable y suficiente para mostrar; el real lo asigna PrismaRestaurantOrderRepository).
    const orderIndex = this.getOrders(restaurantId).findIndex((candidate) => candidate.id === order.id);
    return {
      order: {
        id: order.id,
        dailyNumber: orderIndex >= 0 ? orderIndex + 1 : 1,
        restaurantId,
        tableId: order.tableId,
        status: order.status === 'payment_pending' ? 'pending_payment' : (order.status as 'open' | 'paid' | 'cancelled'),
        currency: order.currency,
        guestCount: 0,
        subtotalCents: order.subtotalCents,
        taxCents: order.taxCents,
        discountTotalCents: 0,
        totalCents: order.totalCents,
        paidCents: 0,
        balanceCents: order.totalCents,
        openedAt: order.openedAt,
        updatedAt: order.updatedAt,
        closedAt: null,
      },
      lines: order.lines.map((line) => ({
        id: line.id,
        restaurantProductId: null,
        productId: null,
        productName: line.productName,
        productType: 'simple',
        course: this.mapDemoLineCourse(line.course),
        preparationRoute: line.course === 'drinks' ? 'bar' : 'kitchen',
        basePriceCents: line.unitPriceCents,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
        subtotalCents: line.subtotalCents,
        taxRateName: null,
        taxRatePercent: null,
        taxCents: 0,
        status: this.mapDemoLineStatus(line.status),
        kitchenNote: line.kitchenNote,
        cancellationReason: null,
        cancelledAt: null,
        configurationSignature: line.id,
        modifiers: [],
        comboSlots: [],
        platterComponents: [],
      })),
      payments: [],
    };
  }

  private mapDemoLineCourse(course: DemoOrderLine['course']): RestaurantOrderView['lines'][number]['course'] {
    switch (course) {
      case 'drinks': return 'drinks';
      case 'starters': return 'starter';
      case 'mains': return 'main';
      case 'desserts': return 'dessert';
      default: return 'other';
    }
  }

  private mapDemoLineStatus(status: ServiceOrderLineStatus): OrderLineStatus {
    switch (status) {
      case 'pending': return 'pending';
      case 'sent_to_kitchen': return 'pending';
      case 'preparing': return 'preparing';
      case 'ready': return 'ready';
      case 'picked_up': return 'ready';
      case 'served': return 'served';
      case 'cancelled': return 'cancelled';
    }
  }

  private isOccupiedStatus(status: ServiceTableStatus): boolean {
    return status !== 'free' && status !== 'reserved';
  }
}

function canTransitionReservationStatus(
  currentStatus: RestaurantReservation['status'],
  nextStatus: RestaurantReservation['status'],
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (currentStatus === 'pending') {
    return nextStatus === 'confirmed' || nextStatus === 'cancelled';
  }

  if (currentStatus === 'confirmed') {
    return nextStatus === 'seated' || nextStatus === 'no_show' || nextStatus === 'cancelled';
  }

  return false;
}
