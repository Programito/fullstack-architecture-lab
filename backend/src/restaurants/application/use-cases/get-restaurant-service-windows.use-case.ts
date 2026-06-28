import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { ServiceWindow } from '../../domain/restaurant-read.models';
import {
  RESTAURANT_SERVICE_WINDOWS_REPOSITORY,
  type RestaurantServiceWindowsRepository,
} from '../ports/restaurant-service-windows-repository.port';

@Injectable()
export class GetRestaurantServiceWindowsUseCase {
  constructor(
    @Inject(RESTAURANT_SERVICE_WINDOWS_REPOSITORY)
    private readonly repository: RestaurantServiceWindowsRepository,
  ) {}

  async execute(restaurantId: string): Promise<Result<ServiceWindow[], ApplicationError>> {
    const windows = await this.repository.findServiceWindowsByRestaurantId(restaurantId);
    return windows ? ok(windows) : err(restaurantNotFound(restaurantId));
  }
}
