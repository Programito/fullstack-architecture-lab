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
  | 'table_not_found'
  | 'floor_not_found'
  | 'invalid_floor_element_layout'
  | 'invalid_floor_layout'
  | 'invalid_service_action'
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
  | 'menu_item_already_in_section';

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
