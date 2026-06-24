import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { UpdateOrderLineCommand, RestaurantOrderView } from '../../domain/restaurant-order.models';
import { RESTAURANT_ORDER_REPOSITORY, type RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';

@Injectable()
export class UpdateRestaurantOrderLineUseCase {
  constructor(
    @Inject(RESTAURANT_ORDER_REPOSITORY) private readonly orders: RestaurantOrderRepository,
  ) {}

  async execute(command: UpdateOrderLineCommand): Promise<Result<RestaurantOrderView, ApplicationError>> {
    if (command.quantity !== undefined && command.quantity <= 0) {
      return err(
        applicationError('invalid_order_configuration', 'Quantity must be at least one.', {
          quantity: command.quantity,
        }),
      );
    }

    try {
      const order = await this.orders.updatePendingLine(command);
      return ok(order);
    } catch (error) {
      if (error instanceof ApplicationErrorException) {
        return err(error.applicationError);
      }
      throw error;
    }
  }
}
