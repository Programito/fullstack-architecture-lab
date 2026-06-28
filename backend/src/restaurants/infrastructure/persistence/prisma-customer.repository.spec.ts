import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrismaCustomerRepository } from './prisma-customer.repository';

describe('PrismaCustomerRepository', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('searches customers through the restaurant organization scope', async () => {
    const repository = new PrismaCustomerRepository({
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'restaurant-mesaflow-centro',
          organizationId: 'org-demo',
        }),
      },
      customer: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'customer-laura',
            name: 'Laura Gomez',
            phone: '+34 600 111 222',
            email: 'laura.gomez@example.com',
            visitCount: 4,
            noShowCount: 0,
            cancelCount: 1,
            lateCount: 0,
          },
        ]),
      },
    } as never);

    const customers = await repository.searchByRestaurantId('restaurant-mesaflow-centro', 'laura');

    expect(customers).toEqual([
      {
        id: 'customer-laura',
        name: 'Laura Gomez',
        phone: '+34 600 111 222',
        email: 'laura.gomez@example.com',
        visitCount: 0,
        noShowCount: 0,
        cancelCount: 0,
        lateCount: 0,
      },
    ]);
  });

  it('creates a new customer for the restaurant organization', async () => {
    const repository = new PrismaCustomerRepository({
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'restaurant-mesaflow-centro',
          organizationId: 'org-demo',
        }),
      },
      customer: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'customer-new',
          organizationId: 'org-demo',
          name: 'Marina Soler',
          phone: '+34 600 999 000',
          email: 'marina@example.com',
          notes: 'Ventana',
          visitCount: 0,
          noShowCount: 0,
          cancelCount: 0,
          lateCount: 0,
        }),
      },
    } as never);

    const customer = await repository.createForRestaurant('restaurant-mesaflow-centro', {
      name: 'Marina Soler',
      phone: '+34 600 999 000',
      email: 'marina@example.com',
      notes: 'Ventana',
    });

    expect(customer).toEqual({
      id: 'customer-new',
      organizationId: 'org-demo',
      name: 'Marina Soler',
      phone: '+34 600 999 000',
      email: 'marina@example.com',
      notes: 'Ventana',
      visitCount: 0,
      noShowCount: 0,
      cancelCount: 0,
      lateCount: 0,
    });
  });

  it('returns already_exists when a matching customer already exists', async () => {
    const repository = new PrismaCustomerRepository({
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'restaurant-mesaflow-centro',
          organizationId: 'org-demo',
        }),
      },
      customer: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'customer-laura',
        }),
      },
    } as never);

    const customer = await repository.createForRestaurant('restaurant-mesaflow-centro', {
      name: 'Laura Gomez',
      phone: '+34 600 111 222',
      email: 'laura.gomez@example.com',
      notes: null,
    });

    expect(customer).toBe('already_exists');
  });
});
