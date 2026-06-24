/**
 * Integration spec for PrismaRestaurantOrderRepository.
 * Requires Docker (Testcontainers). Run with: pnpm test:integration -- prisma-restaurant-order.repository.integration-spec.ts
 *
 * @deferred Docker not available in the current environment.
 */
import { describe, it } from 'vitest';

describe.skip('PrismaRestaurantOrderRepository (integration — requires Docker)', () => {
  it('opens a new order for a table', () => {
    // TODO: seed restaurant + table + user, call open(), assert returned view
  });

  it('returns the existing active order on a second open call for the same table', () => {
    // TODO: open twice, assert same id returned
  });

  it('returns null when no active order exists for the table', () => {
    // TODO: findActiveByTable on a clean table returns null
  });

  it('finds an order by id', () => {
    // TODO: open(), then findById() returns full view
  });
});
