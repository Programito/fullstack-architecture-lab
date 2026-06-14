import type { FloorElement } from './floor-plan.models';
import type { OrderCourse, OrderLine, OrderLineStatus, TableOrder } from './order.models';
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

export interface KitchenOrderTicket {
  table: RestaurantTable;
  servicePoint: FloorElement | null;
  lines: OrderLine[];
}

export type KitchenBoardStatus = Extract<OrderLineStatus, 'sent_to_kitchen' | 'preparing' | 'ready'>;

export interface KitchenBoardColumn {
  status: KitchenBoardStatus;
  tickets: KitchenOrderTicket[];
}

export type PreparationBoardColumnId = 'in_kitchen' | 'ready' | 'served';
export type PreparationFlow = 'direct' | 'kitchen';

export interface PreparationBoardCard {
  tableId: string;
  tableNumber: number;
  line: OrderLine;
  preparationFlow: PreparationFlow;
  requiresReadyBeforeServed: boolean;
  station?: string;
}

export interface PreparationBoardColumn {
  id: PreparationBoardColumnId;
  cards: PreparationBoardCard[];
}

export interface PreparationMoveResult {
  moved: boolean;
  reason?: 'requires_ready_before_served' | 'missing_line' | 'unsupported_target';
  messageKey?: string;
}

export type PosMode = 'operation' | 'edit_layout';
