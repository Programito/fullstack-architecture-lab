import type { CreateCustomerInput, Customer, CustomerSummary } from '../../domain/restaurant-read.models';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export interface CustomerRepository {
  searchByRestaurantId(restaurantId: string, q: string): Promise<CustomerSummary[] | null>;
  createForRestaurant(restaurantId: string, data: CreateCustomerInput): Promise<Customer | 'restaurant_not_found' | 'already_exists'>;
}
