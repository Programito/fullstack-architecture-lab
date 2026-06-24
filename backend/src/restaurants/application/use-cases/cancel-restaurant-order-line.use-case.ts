import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { CancelOrderLineCommand, RestaurantOrderView } from '../../domain/restaurant-order.models';
import { RESTAURANT_ORDER_REPOSITORY, type RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';

@Injectable()
export class CancelRestaurantOrderLineUseCase {
  constructor(
    @Inject(RESTAURANT_ORDER_REPOSITORY) private readonly orders: RestaurantOrderRepository,
  ) {}

  async execute(command: CancelOrderLineCommand): Promise<Result<RestaurantOrderView, ApplicationError>> {
    if (!command.reason.trim()) {
      return err(
        applicationError('invalid_order_configuration', 'Cancellation reason cannot be blank.'),
      );
    }

    try {
      const order = await this.orders.cancelLine(command);
      return ok(order);
    } catch (error) {
      if (error instanceof ApplicationErrorException) {
        return err(error.applicationError);
      }
      throw error;
    }
  }
}
