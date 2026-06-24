import { Inject, Injectable } from '@nestjs/common';

import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RegisterOrderPaymentCommand, RestaurantOrderView } from '../../domain/restaurant-order.models';
import { RESTAURANT_ORDER_REPOSITORY, type RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';

@Injectable()
export class RegisterRestaurantOrderPaymentUseCase {
  constructor(@Inject(RESTAURANT_ORDER_REPOSITORY) private readonly orders: RestaurantOrderRepository) {}

  async execute(command: RegisterOrderPaymentCommand): Promise<Result<RestaurantOrderView, ApplicationError>> {
    if (command.amountCents <= 0) {
      return err(applicationError('invalid_order_configuration', 'Payment amount must be greater than zero.', { amountCents: command.amountCents }));
    }

    try {
      const order = await this.orders.registerPayment(command);
      return ok(order);
    } catch (error) {
      if (error instanceof ApplicationErrorException) return err(error.applicationError);
      throw error;
    }
  }
}
