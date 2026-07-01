export type ApplicationErrorCode =
  | 'invalid_email'
  | 'email_already_taken'
  | 'user_not_found'
  | 'role_not_found'
  | 'permission_not_found'
  | 'role_name_already_taken'
  | 'invalid_password'
  | 'invalid_user_name'
  | 'invalid_role_name'
  | 'task_not_found'
  | 'restaurant_not_found'
  | 'reservation_not_found'
  | 'invalid_reservation_creation'
  | 'table_not_found'
  | 'floor_not_found'
  | 'invalid_floor_element_layout'
  | 'invalid_floor_layout'
  | 'invalid_service_action'
  | 'invalid_reservation_state'
  | 'invalid_order_configuration'
  | 'order_not_found'
  | 'order_line_not_found'
  | 'restaurant_product_not_found'
  | 'invalid_order_state'
  | 'payment_exceeds_balance'
  | 'menu_not_found'
  | 'menu_section_not_found'
  | 'menu_section_name_taken'
  | 'menu_item_not_found'
  | 'menu_item_already_in_section'
  | 'product_name_taken'
  | 'invalid_service_windows'
  | 'customer_not_found'
  | 'customer_already_exists'
  | 'invalid_customer'
  | 'reservation_conflict'
  | 'reservation_in_past'
  | 'insufficient_table_capacity'
  | 'outside_service_hours'
  | 'modifier_group_not_found'
  | 'modifier_group_name_taken'
  | 'modifier_group_in_use';

export type ApplicationError = {
  readonly code: ApplicationErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
};

export function applicationError(
  code: ApplicationErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApplicationError {
  return details ? { code, message, details } : { code, message };
}

export function taskNotFound(taskId: string): ApplicationError {
  return applicationError('task_not_found', `Task "${taskId}" was not found.`, { taskId });
}

export function restaurantNotFound(restaurantId: string): ApplicationError {
  return applicationError('restaurant_not_found', `Restaurant "${restaurantId}" was not found.`, { restaurantId });
}

export function reservationNotFound(reservationId: string): ApplicationError {
  return applicationError('reservation_not_found', `Reservation "${reservationId}" was not found.`, { reservationId });
}

export function tableNotFound(tableId: string): ApplicationError {
  return applicationError('table_not_found', `Table "${tableId}" was not found.`, { tableId });
}

export function floorNotFound(floorId: string): ApplicationError {
  return applicationError('floor_not_found', `Floor "${floorId}" was not found.`, { floorId });
}

export function invalidFloorElementLayout(details?: Record<string, unknown>): ApplicationError {
  return applicationError('invalid_floor_element_layout', 'Floor element layout is invalid.', details);
}

export function invalidFloorLayout(details?: Record<string, unknown>): ApplicationError {
  return applicationError('invalid_floor_layout', 'Floor layout is invalid.', details);
}

export function invalidServiceAction(details?: Record<string, unknown>): ApplicationError {
  return applicationError('invalid_service_action', 'Service action is invalid for the current table state.', details);
}

export function invalidReservationState(details?: Record<string, unknown>): ApplicationError {
  return applicationError('invalid_reservation_state', 'Reservation transition not allowed.', details);
}

export function invalidReservationCreation(details?: Record<string, unknown>): ApplicationError {
  return applicationError('invalid_reservation_creation', 'Reservation creation is invalid.', details);
}

export function restaurantProductNotFound(productId: string): ApplicationError {
  return applicationError('restaurant_product_not_found', `Restaurant product "${productId}" was not found.`, { productId });
}

export function menuNotFound(menuId: string): ApplicationError {
  return applicationError('menu_not_found', `Menu "${menuId}" was not found.`, { menuId });
}

export function menuSectionNotFound(sectionId: string): ApplicationError {
  return applicationError('menu_section_not_found', `Menu section "${sectionId}" was not found.`, { sectionId });
}

export function menuSectionNameTaken(name: string): ApplicationError {
  return applicationError('menu_section_name_taken', `A section named "${name}" already exists in this menu.`, { name });
}

export function menuItemNotFound(itemId: string): ApplicationError {
  return applicationError('menu_item_not_found', `Menu item "${itemId}" was not found.`, { itemId });
}

export function menuItemAlreadyInSection(restaurantProductId: string): ApplicationError {
  return applicationError('menu_item_already_in_section', `Product "${restaurantProductId}" is already in this section.`, { restaurantProductId });
}

export function productNameTaken(name: string): ApplicationError {
  return applicationError('product_name_taken', `A product named "${name}" already exists in this organization.`, { name });
}

export function invalidServiceWindows(reason: string): ApplicationError {
  return applicationError('invalid_service_windows', `Service windows configuration is invalid: ${reason}.`, { reason });
}

export function customerNotFound(customerId: string): ApplicationError {
  return applicationError('customer_not_found', `Customer "${customerId}" was not found.`, { customerId });
}

export function customerAlreadyExists(name: string): ApplicationError {
  return applicationError('customer_already_exists', `A customer named "${name}" with the same contact already exists.`, { name });
}

export function invalidCustomer(reason: string): ApplicationError {
  return applicationError('invalid_customer', `Customer data is invalid: ${reason}.`, { reason });
}

export function reservationConflict(tableId: string): ApplicationError {
  return applicationError('reservation_conflict', `Table "${tableId}" already has an active reservation in this time slot.`, { tableId });
}

export function reservationInPast(): ApplicationError {
  return applicationError('reservation_in_past', 'Reservation date must be in the future.');
}

export function insufficientTableCapacity(tableId: string, required: number, available: number): ApplicationError {
  return applicationError('insufficient_table_capacity', `Table "${tableId}" has capacity for ${available} but ${required} guests are requested.`, { tableId, required, available });
}

export function outsideServiceHours(): ApplicationError {
  return applicationError('outside_service_hours', 'Reservation does not fall within any active service window.');
}

export function modifierGroupNotFound(groupId: string): ApplicationError {
  return applicationError('modifier_group_not_found', `Modifier group "${groupId}" was not found.`, { groupId });
}

export function modifierGroupNameTaken(name: string): ApplicationError {
  return applicationError('modifier_group_name_taken', `A modifier group named "${name}" already exists in this organization.`, { name });
}

export function modifierGroupInUse(groupId: string): ApplicationError {
  return applicationError('modifier_group_in_use', `Modifier group "${groupId}" is assigned to products and cannot be deleted.`, { groupId });
}
