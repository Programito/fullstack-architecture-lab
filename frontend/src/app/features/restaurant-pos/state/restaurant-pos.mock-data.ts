import type { FloorElement, OrdersByTable, Product, RestaurantTable, TableOrder } from '../models/restaurant-pos.models';

export const DEFAULT_GRID_ROWS = 6;
export const DEFAULT_GRID_COLUMNS = 6;

export const MOCK_FLOOR_ELEMENTS: FloorElement[] = [
  {
    id: 'floor-element-1',
    type: 'table',
    label: 'M1',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    tableId: 'table-1',
  },
  {
    id: 'floor-element-2',
    type: 'table',
    label: 'M2',
    x: 2,
    y: 0,
    width: 1,
    height: 1,
    tableId: 'table-2',
  },
  {
    id: 'floor-element-3',
    type: 'bar',
    label: 'Bar',
    x: 0,
    y: 3,
    width: 3,
    height: 1,
  },
  {
    id: 'floor-element-4',
    type: 'kitchen',
    label: 'Kitchen',
    x: 3,
    y: 3,
    width: 2,
    height: 1,
  },
  {
    id: 'floor-element-5',
    type: 'entrance',
    label: 'Entrance',
    x: 5,
    y: 0,
    width: 1,
    height: 1,
  },
  {
    id: 'floor-element-6',
    type: 'stool',
    label: 'Stool 1',
    x: 0,
    y: 2,
    width: 1,
    height: 1,
  },
  {
    id: 'floor-element-7',
    type: 'stool',
    label: 'Stool 2',
    x: 1,
    y: 2,
    width: 1,
    height: 1,
  },
  {
    id: 'floor-element-8',
    type: 'stool',
    label: 'Stool 3',
    x: 2,
    y: 2,
    width: 1,
    height: 1,
  },
];

export const MOCK_RESTAURANT_TABLES: RestaurantTable[] = [
  {
    id: 'table-1',
    number: 1,
    capacity: 2,
    status: 'free',
    total: 0,
    openDuration: '12m',
  },
  {
    id: 'table-2',
    number: 2,
    capacity: 4,
    status: 'free',
    total: 0,
    openDuration: '34m',
  },
  {
    id: 'table-3',
    number: 3,
    capacity: 6,
    status: 'reserved',
    total: 0,
    openDuration: '1h 05m',
  },
  {
    id: 'table-4',
    number: 4,
    capacity: 4,
    status: 'free',
    total: 0,
    openDuration: '1h 25m',
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'product-1',
    name: 'Craft Burger',
    category: 'Burgers',
    price: 12.5,
    available: true,
    allergens: ['gluten', 'milk', 'egg'],
  },
  {
    id: 'product-2',
    name: 'Iberian Ham Croquettes',
    category: 'Tapas',
    price: 8.75,
    available: true,
    allergens: ['gluten', 'milk'],
  },
  {
    id: 'product-3',
    name: 'Sparkling Lemonade',
    category: 'Drinks',
    price: 4.5,
    available: true,
  },
  {
    id: 'product-4',
    name: 'Chocolate Coulant',
    category: 'Desserts',
    price: 7,
    available: false,
    allergens: ['gluten', 'egg', 'milk'],
  },
  {
    id: 'product-5',
    name: 'Caesar Salad',
    category: 'Salads',
    price: 10,
    available: true,
    allergens: ['egg', 'fish'],
  },
  {
    id: 'product-6',
    name: 'Espresso',
    category: 'Coffee',
    price: 2.5,
    available: true,
  },
];

const createOpenOrder = (tableId: string): TableOrder => ({
  tableId,
  lines: [],
  total: 0,
  status: 'open',
  paymentMethod: 'pending',
});

export const MOCK_ORDERS_BY_TABLE: OrdersByTable = MOCK_RESTAURANT_TABLES.reduce<OrdersByTable>(
  (orders, table) => ({
    ...orders,
    [table.id]: createOpenOrder(table.id),
  }),
  {},
);
