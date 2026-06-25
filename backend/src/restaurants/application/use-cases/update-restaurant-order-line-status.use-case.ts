import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { UpdateOrderLineStatusCommand, RestaurantOrderView } from '../../domain/restaurant-order.models';
import { RESTAURANT_ORDER_REPOSITORY, type RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

@Injectable()
export class UpdateRestaurantOrderLineStatusUseCase {
  constructor(
    @Inject(RESTAURANT_ORDER_REPOSITORY) private readonly orders: RestaurantOrderRepository,
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(command: UpdateOrderLineStatusCommand): Promise<Result<RestaurantOrderView, ApplicationError>> {
    const persistentOrder = await this.orders.findById(command.restaurantId, command.orderId);

    if (persistentOrder) {
      try {
        const order = await this.orders.updateLineStatus(command);
        return ok(order);
      } catch (error) {
        if (error instanceof ApplicationErrorException) {
          return err(error.applicationError);
        }
        throw error;
      }
    }

    // Demo fallback: update in-memory demo state
    const order = await this.restaurants.updateServiceOrderLineStatus(
      command.restaurantId,
      command.orderId,
      command.lineId,
      command.status,
    );
    if (!order) {
      return err(applicationError('order_line_not_found', `Order line "${command.lineId}" not found.`, { lineId: command.lineId }));
    }
    return ok(order);
  }
}
