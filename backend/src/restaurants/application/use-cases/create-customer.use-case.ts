import { Inject, Injectable } from '@nestjs/common';

import {
  customerAlreadyExists,
  invalidCustomer,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { CreateCustomerInput, Customer } from '../../domain/restaurant-read.models';
import { CUSTOMER_REPOSITORY, type CustomerRepository } from '../ports/customer-repository.port';

type CreateCustomerCommand = { restaurantId: string } & CreateCustomerInput;

@Injectable()
export class CreateCustomerUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async execute(command: CreateCustomerCommand): Promise<Result<Customer, ApplicationError>> {
    if (command.name.trim().length === 0) {
      return err(invalidCustomer('name is required'));
    }

    const result = await this.customers.createForRestaurant(command.restaurantId, {
      name: command.name,
      phone: command.phone,
      email: command.email,
      notes: command.notes,
    });

    if (result === 'restaurant_not_found') return err(restaurantNotFound(command.restaurantId));
    if (result === 'already_exists') return err(customerAlreadyExists(command.name));

    return ok(result);
  }
}
