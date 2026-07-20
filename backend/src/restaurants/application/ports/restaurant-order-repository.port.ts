import type {
  AddOrderLineCommand,
  CancelOrderLineCommand,
  DeleteOrderLineCommand,
  OpenRestaurantOrderCommand,
  RegisterOrderPaymentCommand,
  RestaurantOrderView,
  UpdateOrderLineCommand,
  UpdateOrderLineStatusCommand,
} from '../../domain/restaurant-order.models';

export const RESTAURANT_ORDER_REPOSITORY = Symbol('RESTAURANT_ORDER_REPOSITORY');

export interface RestaurantOrderRepository {
  tableExists(restaurantId: string, tableId: string): Promise<boolean>;
  findActiveByTable(restaurantId: string, tableId: string): Promise<RestaurantOrderView | null>;
  findById(restaurantId: string, orderId: string): Promise<RestaurantOrderView | null>;
  open(command: OpenRestaurantOrderCommand): Promise<RestaurantOrderView>;
  addLine(command: AddOrderLineCommand): Promise<RestaurantOrderView>;
  updatePendingLine(command: UpdateOrderLineCommand): Promise<RestaurantOrderView>;
  deletePendingLine(command: DeleteOrderLineCommand): Promise<RestaurantOrderView>;
  cancelLine(command: CancelOrderLineCommand): Promise<RestaurantOrderView>;
  updateLineStatus(command: UpdateOrderLineStatusCommand): Promise<RestaurantOrderView>;
  sendPendingLinesToKitchen(restaurantId: string, tableId: string, lineIds?: string[]): Promise<RestaurantOrderView | null>;
  markActiveLinesServed(restaurantId: string, tableId: string, lineIds?: string[]): Promise<RestaurantOrderView | null>;
  registerPayment(command: RegisterOrderPaymentCommand): Promise<RestaurantOrderView>;
  clearActiveByTable(restaurantId: string, tableId: string): Promise<void>;
}
