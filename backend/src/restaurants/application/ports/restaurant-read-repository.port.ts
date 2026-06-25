import type {
  RestaurantFloors,
  RestaurantMenu,
  RestaurantReservation,
  RestaurantSummary,
} from '../../domain/restaurant-read.models';
import type { RestaurantOrderView } from '../../domain/restaurant-order.models';
import type { ServiceFloorView, ServicePointDetailView, ServicePointOrderView } from '../../domain/service-floor.models';

export const RESTAURANT_READ_REPOSITORY = Symbol('RESTAURANT_READ_REPOSITORY');

export interface RestaurantReadRepository {
  listRestaurants(): Promise<RestaurantSummary[]>;
  findMenuByRestaurantId(restaurantId: string): Promise<RestaurantMenu | null>;
  findFloorsByRestaurantId(restaurantId: string): Promise<RestaurantFloors | null>;
  listReservationsByRestaurantId(restaurantId: string): Promise<RestaurantReservation[] | null>;
  findServiceFloorByRestaurantId(restaurantId: string): Promise<ServiceFloorView | null>;
  findServicePointByRestaurantId(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null>;
  findServicePointOrderByRestaurantId(restaurantId: string, tableId: string): Promise<ServicePointOrderView | null>;
  occupyServicePoint(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null>;
  sendServicePointOrderToKitchen(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null>;
  markServicePointOrderServed(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null>;
  chargeServicePoint(restaurantId: string, tableId: string): Promise<ServicePointDetailView | null>;
  setServicePointStatus(restaurantId: string, tableId: string, status: import('../../domain/service-floor.models').ServiceTableStatus): Promise<ServicePointDetailView | null>;
  reorderFloorElements(
    restaurantId: string,
    floorId: string,
    elements: Array<{ id: string; x: number; y: number; width: number; height: number; sortOrder: number }>,
  ): Promise<RestaurantFloors | null>;
  updateFloor(
    restaurantId: string,
    floorId: string,
    floor: { name: string; rows: number; columns: number },
  ): Promise<RestaurantFloors | null>;
  updateFloorElement(
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
  ): Promise<RestaurantFloors | null>;
  updateServiceOrderLineStatus(
    restaurantId: string,
    orderId: string,
    lineId: string,
    status: 'sent_to_kitchen' | 'preparing' | 'ready' | 'served',
  ): Promise<RestaurantOrderView | null>;
  createFloorElement(
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
  ): Promise<RestaurantFloors | null>;
}
