import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { CustomerSummary } from '../../domain/restaurant-read.models';
import { CUSTOMER_REPOSITORY, type CustomerRepository } from '../ports/customer-repository.port';

type SearchCustomersCommand = {
  restaurantId: string;
  q: string;
};

@Injectable()
export class SearchCustomersUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async execute(command: SearchCustomersCommand): Promise<Result<CustomerSummary[], ApplicationError>> {
    const results = await this.customers.searchByRestaurantId(command.restaurantId, command.q);
    return results !== null ? ok(results) : err(restaurantNotFound(command.restaurantId));
  }
}
