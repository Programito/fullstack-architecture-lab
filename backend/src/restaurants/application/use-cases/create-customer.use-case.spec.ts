import { describe, it, expect } from 'vitest';

import type { CustomerRepository } from '../ports/customer-repository.port';
import type { Customer } from '../../domain/restaurant-read.models';
import { CreateCustomerUseCase } from './create-customer.use-case';

const RESTAURANT_ID = 'rest-1';

const CREATED_CUSTOMER: Customer = {
  id: 'c-1',
  organizationId: 'org-1',
  name: 'Ana García',
  phone: '612345678',
  email: null,
  notes: null,
  visitCount: 0,
  noShowCount: 0,
  cancelCount: 0,
  lateCount: 0,
};

function makeRepo(overrides?: Partial<CustomerRepository>): CustomerRepository {
  return {
    searchByRestaurantId: async () => [],
    createForRestaurant: async () => CREATED_CUSTOMER,
    ...overrides,
  };
}

describe('CreateCustomerUseCase', () => {
  it('creates a customer and returns it', async () => {
    const uc = new CreateCustomerUseCase(makeRepo());
    const result = await uc.execute({ restaurantId: RESTAURANT_ID, name: 'Ana García', phone: '612345678', email: null, notes: null });
    expect(result).toEqual({ ok: true, value: CREATED_CUSTOMER });
  });

  it('rejects empty name', async () => {
    const uc = new CreateCustomerUseCase(makeRepo());
    const result = await uc.execute({ restaurantId: RESTAURANT_ID, name: '  ', phone: null, email: null, notes: null });
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'invalid_customer' }) });
  });

  it('returns restaurant_not_found when repo returns restaurant_not_found', async () => {
    const uc = new CreateCustomerUseCase(makeRepo({ createForRestaurant: async () => 'restaurant_not_found' }));
    const result = await uc.execute({ restaurantId: 'unknown', name: 'Test', phone: null, email: null, notes: null });
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'restaurant_not_found' }) });
  });

  it('returns customer_already_exists when repo returns already_exists', async () => {
    const uc = new CreateCustomerUseCase(makeRepo({ createForRestaurant: async () => 'already_exists' }));
    const result = await uc.execute({ restaurantId: RESTAURANT_ID, name: 'Ana García', phone: '612345678', email: null, notes: null });
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'customer_already_exists' }) });
  });
});
