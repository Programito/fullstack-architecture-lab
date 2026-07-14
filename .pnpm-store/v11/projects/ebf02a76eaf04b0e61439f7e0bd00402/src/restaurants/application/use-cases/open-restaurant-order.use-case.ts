import { Inject, Injectable } from '@nestjs/common';

import { applicationError, tableNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { OpenRestaurantOrderCommand, RestaurantOrderView } from '../../domain/restaurant-order.models';
import { RESTAURANT_ORDER_REPOSITORY, type RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';

@Injectable()
export class OpenRestaurantOrderUseCase {
  constructor(
    @Inject(RESTAURANT_ORDER_REPOSITORY) private readonly orders: RestaurantOrderRepository,
  ) {}

  async execute(
    command: OpenRestaurantOrderCommand,
  ): Promise<Result<{ order: RestaurantOrderView; created: boolean }, ApplicationError>> {
    if (command.guestCount <= 0) {
      return err(
        applicationError('invalid_order_configuration', 'Guest count must be at least one.', {
          guestCount: command.guestCount,
        }),
      );
    }

    const exists = await this.orders.tableExists(command.restaurantId, command.tableId);
    if (!exists) {
      return err(tableNotFound(command.tableId));
    }

    const existing = await this.orders.findActiveByTable(command.restaurantId, command.tableId);
    if (existing) {
      return ok({ order: existing, created: false });
    }

    try {
      const newOrder = await this.orders.open(command);
      return ok({ order: newOrder, created: true });
    } catch (error) {
      if (isPrismaUniqueConflict(error)) {
        const concurrent = await this.orders.findActiveByTable(command.restaurantId, command.tableId);
        if (concurrent) {
          return ok({ order: concurrent, created: false });
        }
      }
      throw error;
    }
  }
}

function isPrismaUniqueConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as Record<string, unknown>)['code'] === 'P2002'
  );
}
