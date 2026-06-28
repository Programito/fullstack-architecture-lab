import { describe, it, expect, beforeEach } from 'vitest';

import type { CustomerRepository } from '../ports/customer-repository.port';
import type { CustomerSummary } from '../../domain/restaurant-read.models';
import { SearchCustomersUseCase } from './search-customers.use-case';

const RESTAURANT_ID = 'rest-1';

function makeRepo(overrides?: Partial<CustomerRepository>): CustomerRepository {
  return {
    searchByRestaurantId: async () => [],
    createForRestaurant: async () => 'restaurant_not_found',
    ...overrides,
  };
}

const DEMO_CUSTOMERS: CustomerSummary[] = [
  { id: '1', name: 'Ana García', phone: '612345678', email: null, visitCount: 3, noShowCount: 0, cancelCount: 0, lateCount: 0 },
  { id: '2', name: 'Carlos López', phone: null, email: 'carlos@email.com', visitCount: 1, noShowCount: 1, cancelCount: 0, lateCount: 0 },
];

describe('SearchCustomersUseCase', () => {
  it('passes the query to the repository and returns the result', async () => {
    let capturedQ: string | undefined;
    const repo = makeRepo({
      searchByRestaurantId: async (_id, q) => {
        capturedQ = q;
        return DEMO_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
      },
    });
    const uc = new SearchCustomersUseCase(repo);

    const result = await uc.execute({ restaurantId: RESTAURANT_ID, q: 'ana' });

    expect(capturedQ).toBe('ana');
    expect(result).toEqual({ ok: true, value: [DEMO_CUSTOMERS[0]] });
  });

  it('returns all customers when query is empty', async () => {
    const uc = new SearchCustomersUseCase(makeRepo({ searchByRestaurantId: async () => DEMO_CUSTOMERS }));
    const result = await uc.execute({ restaurantId: RESTAURANT_ID, q: '' });
    expect(result).toEqual({ ok: true, value: DEMO_CUSTOMERS });
  });

  it('returns restaurant_not_found when repo returns null', async () => {
    const uc = new SearchCustomersUseCase(makeRepo({ searchByRestaurantId: async () => null }));
    const result = await uc.execute({ restaurantId: 'unknown', q: '' });
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'restaurant_not_found' }) });
  });
});
