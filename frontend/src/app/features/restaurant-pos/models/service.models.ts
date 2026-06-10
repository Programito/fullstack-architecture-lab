import type { FloorElement } from './floor-plan.models';
import type { OrderCourse, TableOrder } from './order.models';
import type { RestaurantTable } from './table.models';

export type NextServiceAction = 'send_kitchen' | 'mark_served' | 'charge' | 'cleaning' | 'free_table' | 'none';

export interface OrderCourseGroup {
  course: OrderCourse;
  lines: TableOrder['lines'];
  total: number;
  quantity: number;
}

export interface ServiceTableInfo {
  table: RestaurantTable;
  order: TableOrder;
  courseGroups: OrderCourseGroup[];
  pendingKitchenCount: number;
  servicePhase: {
    course: OrderCourse | null;
    status: 'no_order' | 'pending' | 'ready_to_charge';
  };
  nextAction: {
    type: NextServiceAction;
    count: number;
  };
  canSendToKitchen: boolean;
  canMarkServed: boolean;
  canCharge: boolean;
  canMarkCleaning: boolean;
  canFreeTable: boolean;
}

export interface ServicePoint {
  element: FloorElement;
  table: RestaurantTable;
}

export type PosMode = 'operation' | 'edit_layout';
