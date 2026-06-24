import { Inject, Injectable } from '@nestjs/common';

import {
  invalidServiceAction,
  restaurantNotFound,
  tableNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { ServicePointDetailView } from '../../domain/service-floor.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

@Injectable()
export class ChargeRestaurantServicePointUseCase {
  constructor(@Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository) {}

  async execute(restaurantId: string, tableId: string): Promise<Result<ServicePointDetailView, ApplicationError>> {
    const floors = await this.restaurants.findFloorsByRestaurantId(restaurantId);

    if (!floors) {
      return err(restaurantNotFound(restaurantId));
    }

    if (!floors.tables.some((table) => table.id === tableId)) {
      return err(tableNotFound(tableId));
    }

    const servicePoint = await this.restaurants.findServicePointByRestaurantId(restaurantId, tableId);
    if (!servicePoint) {
      return err(tableNotFound(tableId));
    }

    if (
      servicePoint.serviceInfo.totalCents <= 0 ||
      servicePoint.table.status === 'free' ||
      servicePoint.table.status === 'reserved' ||
      servicePoint.table.status === 'paid' ||
      servicePoint.table.status === 'cleaning'
    ) {
      return err(invalidServiceAction({ restaurantId, tableId, action: 'charge' }));
    }

    const chargedServicePoint = await this.restaurants.chargeServicePoint(restaurantId, tableId);
    return chargedServicePoint ? ok(chargedServicePoint) : err(tableNotFound(tableId));
  }
}
