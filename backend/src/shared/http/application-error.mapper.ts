import { BadRequestException, ConflictException, ForbiddenException, HttpException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import type { ApplicationError } from '../errors/application-error';
import type { Result } from '../result/result';
import { isOk } from '../result/result';

export function unwrapResultOrThrow<T>(result: Result<T, ApplicationError>): T {
  if (isOk(result)) {
    return result.value;
  }

  throw toHttpException(result.error);
}

export function toHttpException(error: ApplicationError): HttpException {
  switch (error.code) {
    case 'invalid_email':
    case 'invalid_password':
    case 'invalid_user_name':
    case 'invalid_role_name':
    case 'invalid_floor_element_layout':
    case 'invalid_floor_layout':
    case 'invalid_service_action':
    case 'invalid_reservation_state':
    case 'invalid_reservation_creation':
    case 'invalid_order_configuration':
    case 'invalid_service_windows':
    case 'invalid_customer':
    case 'invalid_analytics_range':
      return new BadRequestException(error.message);

    case 'user_not_found':
    case 'role_not_found':
    case 'task_not_found':
    case 'restaurant_not_found':
    case 'time_entry_not_found':
    case 'time_entry_change_request_not_found':
    case 'reservation_not_found':
    case 'table_not_found':
    case 'floor_not_found':
    case 'order_not_found':
    case 'order_line_not_found':
    case 'restaurant_product_not_found':
    case 'menu_not_found':
    case 'menu_section_not_found':
    case 'menu_item_not_found':
    case 'customer_not_found':
    case 'modifier_group_not_found':
      return new NotFoundException(error.message);

    case 'email_already_taken':
    case 'role_name_already_taken':
    case 'invalid_order_state':
    case 'menu_section_name_taken':
    case 'menu_item_already_in_section':
    case 'product_name_taken':
    case 'customer_already_exists':
    case 'reservation_conflict':
    case 'modifier_group_name_taken':
    case 'modifier_group_in_use':
    case 'time_entry_already_open':
    case 'time_entry_not_open':
    case 'time_entry_change_request_already_reviewed':
      return new ConflictException(error.message);

    case 'payment_exceeds_balance':
    case 'reservation_in_past':
    case 'insufficient_table_capacity':
    case 'outside_service_hours':
      return new UnprocessableEntityException(error.message);

    case 'forbidden_time_entry_access':
      return new ForbiddenException(error.message);

    default:
      return new InternalServerErrorException('Unexpected application error.');
  }
}
