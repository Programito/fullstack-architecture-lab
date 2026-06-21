import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { RestaurantReadRepository } from '../application/ports/restaurant-read-repository.port';
import type {
  RestaurantFloors,
  RestaurantMenu,
  RestaurantReservation,
  RestaurantSummary,
} from '../domain/restaurant-read.models';

const DEMO_RESTAURANT_ID = 'restaurant-mesaflow-centro';

const INITIAL_RESTAURANTS: RestaurantSummary[] = [
  {
    id: DEMO_RESTAURANT_ID,
    name: 'MesaFlow Centro',
    displayName: 'MesaFlow Centro',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    isActive: true,
  },
];

const INITIAL_MENUS = new Map<string, RestaurantMenu>([
  [
    DEMO_RESTAURANT_ID,
    {
      restaurantId: DEMO_RESTAURANT_ID,
      name: 'Carta principal',
      isActive: true,
      sections: [
        {
          id: 'menu-section-drinks',
          name: 'Bebidas',
          sortOrder: 1,
          isVisible: true,
          items: [
            { id: 'menu-item-coke', name: 'Coca-Cola', productType: 'simple', priceCents: 300, currency: 'EUR', isAvailable: true },
            { id: 'menu-item-water', name: 'Agua mineral', productType: 'simple', priceCents: 250, currency: 'EUR', isAvailable: true },
            { id: 'menu-item-beer', name: 'Cerveza', productType: 'simple', priceCents: 350, currency: 'EUR', isAvailable: true },
          ],
        },
        {
          id: 'menu-section-mains',
          name: 'Principales',
          sortOrder: 2,
          isVisible: true,
          items: [
            { id: 'menu-item-burger', name: 'Hamburguesa craft', productType: 'simple', priceCents: 1250, currency: 'EUR', isAvailable: true },
            { id: 'menu-item-croquetas', name: 'Croquetas de jamon iberico', productType: 'simple', priceCents: 980, currency: 'EUR', isAvailable: true },
            { id: 'menu-item-combo', name: 'Menu Classic Burger', productType: 'combo', priceCents: 1390, currency: 'EUR', isAvailable: true },
            { id: 'menu-item-platter', name: 'Plato combinado vegetal', productType: 'platter', priceCents: 1190, currency: 'EUR', isAvailable: true },
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
      },
    ],
  ],
]);

@Injectable()
export class DemoRestaurantReadRepository implements RestaurantReadRepository {
  private restaurants = structuredClone(INITIAL_RESTAURANTS);
  private menus = structuredClone([...INITIAL_MENUS.entries()]) as Array<[string, RestaurantMenu]>;
  private floors = structuredClone([...INITIAL_FLOORS.entries()]) as Array<[string, RestaurantFloors]>;
  private reservations = structuredClone([...INITIAL_RESERVATIONS.entries()]) as Array<[string, RestaurantReservation[]]>;

  reset(): void {
    this.restaurants = structuredClone(INITIAL_RESTAURANTS);
    this.menus = structuredClone([...INITIAL_MENUS.entries()]) as Array<[string, RestaurantMenu]>;
    this.floors = structuredClone([...INITIAL_FLOORS.entries()]) as Array<[string, RestaurantFloors]>;
    this.reservations = structuredClone([...INITIAL_RESERVATIONS.entries()]) as Array<[string, RestaurantReservation[]]>;
  }

  async listRestaurants(): Promise<RestaurantSummary[]> {
    return this.restaurants.map((restaurant) => ({ ...restaurant }));
  }

  async findMenuByRestaurantId(restaurantId: string): Promise<RestaurantMenu | null> {
    const menu = new Map(this.menus).get(restaurantId);
    return menu ? structuredClone(menu) : null;
  }

  async findFloorsByRestaurantId(restaurantId: string): Promise<RestaurantFloors | null> {
    const floors = new Map(this.floors).get(restaurantId);
    return floors ? structuredClone(floors) : null;
  }

  async listReservationsByRestaurantId(restaurantId: string): Promise<RestaurantReservation[] | null> {
    const reservations = new Map(this.reservations).get(restaurantId);
    return reservations ? structuredClone(reservations) : null;
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
}
